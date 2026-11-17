
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

test('parses a return statement with a value', () => {
  const { program } = compile(`
    fn getNumber() {
      return 10;
    }
  `)

  const fn = program.statements[0]
  const statement = fn.body[0]

  assert.equal(statement.kind, 'ReturnStatement')
  assert.equal(statement.keyword.lexeme, 'return')
  assert.equal(statement.value.kind, 'LiteralExpression')
  assert.equal(statement.value.value, 10)
})

test('parses a return statement without a value', () => {
  const { program } = compile(`
    fn stop() {
      return;
    }
  `)

  const fn = program.statements[0]
  const statement = fn.body[0]

  assert.equal(statement.kind, 'ReturnStatement')
  assert.equal(statement.value, null)
})

test('accepts return with a value inside a function', () => {
  const { semantic } = compile(`
    fn getNumber() {
      return 10;
    }
  `)

  assert.deepEqual(semantic.errors, [])
})

test('accepts return without a value inside a function', () => {
  const { semantic } = compile(`
    fn stop() {
      return;
    }
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports return outside a function', () => {
  const { semantic } = compile(`
    return 10;
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        'Cannot return from outside a function.',
      ),
    ),
  )
})

test('accepts return inside a nested if block', () => {
  const { semantic } = compile(`
    fn check(value) {
      if (true) {
        return value;
      }
    }
  `)

  assert.deepEqual(semantic.errors, [])
})

test('checks the expression inside a return statement', () => {
  const { semantic } = compile(`
    fn getNumber() {
      return unknownValue;
    }
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Variable 'unknownValue' is not declared.",
      ),
    ),
  )
})

test('reports a missing semicolon after return', () => {
  const lex = tokenize(`
    fn getNumber() {
      return 10
    }
  `)

  assert.deepEqual(lex.errors, [])

  const parsed = parseTokens(lex.tokens)

  assert.ok(
    parsed.errors.some(error =>
      error.message.includes(
        "Expected ';' after return statement.",
      ),
    ),
  )
})
