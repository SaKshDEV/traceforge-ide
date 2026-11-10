
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
  return {
    parsed,
    semantic: analyze(parsed.program),
  }
}

test('parses a valid if statement', () => {
  const { parsed } = compile(
    'if (true) { let age = 20; }',
  )

  assert.deepEqual(parsed.errors, [])
  assert.equal(
    parsed.program.statements[0].kind,
    'IfStatement',
  )
})

test('parses if and else branches', () => {
  const { parsed } = compile(
    'if (true) { let x = 1; } else { let y = 2; }',
  )

  assert.deepEqual(parsed.errors, [])

  const statement = parsed.program.statements[0]

  assert.equal(statement.thenBranch.length, 1)
  assert.equal(statement.elseBranch.length, 1)
})

test('accepts boolean if conditions', () => {
  const { semantic } = compile(
    'if (10 > 5) { let x = 1; }',
  )

  assert.deepEqual(semantic.errors, [])
})

test('rejects number as an if condition', () => {
  const { semantic } = compile(
    'if (123) { let x = 1; }',
  )

  assert.ok(
    semantic.errors.some(
      error => error.message === 'If condition must be a boolean.',
    ),
  )
})

test('accepts nested if statements', () => {
  const { parsed } = compile(
    'if (true) { if (false) { let x = 1; } }',
  )

  assert.deepEqual(parsed.errors, [])
})
