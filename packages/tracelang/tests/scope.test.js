
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

  return analyze(parsed.program)
}

test('rejects variable used outside its if block', () => {
  const result = compile(
    'if (true) { let inside = 10; } inside;',
  )

  assert.ok(
    result.errors.some(
      error => error.message === "Variable 'inside' is not declared.",
    ),
  )
})

test('allows outer variable inside if block', () => {
  const result = compile(
    'let value = 10; if (true) { value; }',
  )

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.warnings, [])
})

test('allows variable shadowing inside nested scope', () => {
  const result = compile(
    'let value = 10; if (true) { let value = "hello"; value; } value;',
  )

  assert.deepEqual(result.errors, [])
  assert.deepEqual(result.warnings, [])
})

test('rejects duplicate declaration in same block', () => {
  const result = compile(
    'if (true) { let value = 10; let value = 20; }',
  )

  assert.ok(
    result.errors.some(
      error => error.message === "Variable 'value' is already declared.",
    ),
  )
})

test('does not share variables between if and else blocks', () => {
  const result = compile(
    'if (true) { let first = 10; } else { first; }',
  )

  assert.ok(
    result.errors.some(
      error => error.message === "Variable 'first' is not declared.",
    ),
  )
})
