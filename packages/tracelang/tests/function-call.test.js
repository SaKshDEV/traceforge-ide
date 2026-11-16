
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  tokenize,
  parseTokens,
  analyze,
} from '../dist/index.js'

function compile(source) {
  const lex = tokenize(source)
  assert.deepEqual(lex.errors, [])

  const parsed = parseTokens(lex.tokens)
  assert.deepEqual(parsed.errors, [])

  return {
    program: parsed.program,
    semantic: analyze(parsed.program),
  }
}

test('parses a function call without arguments', () => {
  const { program } = compile(`
    fn greet() {
      let message = "Hello";
    }

    greet();
  `)

  const call = program.statements[1].expression

  assert.equal(call.kind, 'CallExpression')
  assert.equal(call.callee.lexeme, 'greet')
  assert.equal(call.arguments.length, 0)
})

test('parses function calls with multiple arguments', () => {
  const { program } = compile(`
    fn add(a, b) {
      let result = a + b;
    }

    add(10, 20);
  `)

  const call = program.statements[1].expression

  assert.equal(call.kind, 'CallExpression')
  assert.equal(call.arguments.length, 2)
})

test('accepts a function call with correct argument count', () => {
  const { semantic } = compile(`
    fn add(a, b) {
      let result = a + b;
    }

    add(10, 20);
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports an undeclared function', () => {
  const { semantic } = compile(`
    unknownFunction();
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Function 'unknownFunction' is not declared.",
      ),
    ),
  )
})

test('reports incorrect argument count', () => {
  const { semantic } = compile(`
    fn add(a, b) {
      let result = a + b;
    }

    add(10);
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        'expects 2 argument(s), but got 1.',
      ),
    ),
  )
})

test('reports duplicate function declarations', () => {
  const { semantic } = compile(`
    fn greet() {
      let message = "Hello";
    }

    fn greet() {
      let message = "Hi";
    }
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Function 'greet' is already declared.",
      ),
    ),
  )
})
