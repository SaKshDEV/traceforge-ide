
import test from 'node:test'
import assert from 'node:assert/strict'
import { tokenize, parseTokens, analyze } from '../dist/index.js'

function compile(source) {
  const lex = tokenize(source)
  assert.deepEqual(lex.errors, [])

  const parsed = parseTokens(lex.tokens)
  assert.deepEqual(parsed.errors, [])

  return analyze(parsed.program)
}

test('accepts while with a boolean condition', () => {
  const result = compile(
    'let count = 0; while (count < 5) { count; }',
  )

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.warnings, [])
})

test('rejects a number as while condition', () => {
  const result = compile('while (10) { }')

  assert.ok(
    result.errors.some(error =>
      error.message === 'While condition must be a boolean.',
    ),
  )
})

test('rejects a string as while condition', () => {
  const result = compile('while ("hello") { }')

  assert.ok(
    result.errors.some(error =>
      error.message === 'While condition must be a boolean.',
    ),
  )
})

test('allows outer variables inside while block', () => {
  const result = compile(
    'let value = 10; while (value > 0) { value; }',
  )

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.warnings, [])
})

test('does not allow while block variables outside the loop', () => {
  const result = compile(
    'while (true) { let inside = 10; inside; } inside;',
  )

  assert.ok(
    result.errors.some(error =>
      error.message === "Variable 'inside' is not declared.",
    ),
  )
})
