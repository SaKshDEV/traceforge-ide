
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

test('accepts AND with boolean operands', () => {
  const result = compile('true && false;')
  assert.deepEqual(result.errors, [])
})

test('accepts OR with boolean operands', () => {
  const result = compile('true || false;')
  assert.deepEqual(result.errors, [])
})

test('rejects number with AND', () => {
  const result = compile('10 && true;')
  assert.ok(result.errors.length > 0)
})

test('rejects string with OR', () => {
  const result = compile('"hello" || false;')
  assert.ok(result.errors.length > 0)
})

test('accepts combined logical operators', () => {
  const result = compile('true || false && true;')
  assert.deepEqual(result.errors, [])
})
