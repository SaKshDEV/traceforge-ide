
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

test('parses else if statement', () => {
  const { parsed } = compile(
    'if (true) { let a = 1; } else if (false) { let b = 2; }',
  )

  assert.deepEqual(parsed.errors, [])

  const statement = parsed.program.statements[0]

  assert.equal(statement.kind, 'IfStatement')
  assert.equal(statement.elseBranch[0].kind, 'IfStatement')
})

test('parses multiple else if branches', () => {
  const { parsed } = compile(
    'if (true) { let a = 1; } else if (false) { let b = 2; } else if (true) { let c = 3; } else { let d = 4; }',
  )

  assert.deepEqual(parsed.errors, [])

  const first = parsed.program.statements[0]
  const second = first.elseBranch[0]

  assert.equal(second.kind, 'IfStatement')
  assert.equal(second.elseBranch[0].kind, 'IfStatement')
  assert.equal(second.elseBranch[0].elseBranch.length, 1)
})

test('validates else if conditions', () => {
  const { semantic } = compile(
    'if (true) { let a = 1; } else if (10) { let b = 2; }',
  )

  assert.ok(
    semantic.errors.some(
      error => error.message === 'If condition must be a boolean.',
    ),
  )
})

test('accepts valid else if conditions', () => {
  const { semantic } = compile(
    'if (10 > 5) { let a = 1; } else if (5 > 2) { let b = 2; }',
  )

  assert.deepEqual(semantic.errors, [])
})