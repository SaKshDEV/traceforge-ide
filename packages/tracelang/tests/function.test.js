
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

test('parses a function without parameters', () => {
  const { program } = compile(`
    fn greet() {
      let message = "Hello";
    }
  `)

  assert.equal(
    program.statements[0].kind,
    'FunctionDeclaration',
  )
})

test('parses function parameters', () => {
  const { program } = compile(`
    fn add(a, b) {
      let result = a + b;
    }
  `)

  const fn = program.statements[0]

  assert.equal(fn.name.lexeme, 'add')

  assert.deepEqual(
    fn.parameters.map(parameter => parameter.name.lexeme),
    ['a', 'b'],
  )
})

test('allows function parameters inside its body', () => {
  const { semantic } = compile(`
    fn add(a, b) {
      let result = a + b;
    }
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports duplicate function parameters', () => {
  const { semantic } = compile(`
    fn add(a, a) {
      let result = a;
    }
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes("Variable 'a' is already declared."),
    ),
  )
})

test('does not allow function local variables outside', () => {
  const { semantic } = compile(`
    fn greet() {
      let message = "Hello";
    }

    message;
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes("Variable 'message' is not declared."),
    ),
  )
})
