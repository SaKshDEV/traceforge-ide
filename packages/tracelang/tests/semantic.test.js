import test from 'node:test'
import assert from 'node:assert/strict'

import {
  tokenize,
  parseTokens,
  analyze,
} from '../dist/index.js'

function analyzeSource(source) {
  const lexResult = tokenize(source)

  assert.deepEqual(lexResult.errors, [])

  const parseResult = parseTokens(lexResult.tokens)

  assert.deepEqual(parseResult.errors, [])

  return analyze(parseResult.program)
}

test('accepts variables declared before use', () => {
  const result = analyzeSource(`
    let age = 21;
    let total = age + 10;
  `)

  assert.equal(result.errors.length, 0)
})

test('reports an undefined variable', () => {
  const result = analyzeSource(`
    let total = age + 10;
  `)

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    "Variable 'age' is not declared.",
  )
})

test('reports duplicate variable declarations', () => {
  const result = analyzeSource(`
    let age = 21;
    let age = 25;
  `)

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    "Variable 'age' is already declared.",
  )
})

test('reports multiple undefined variables', () => {
  const result = analyzeSource(`
    let total = price + quantity;
  `)

  assert.equal(result.errors.length, 2)
})
test('reports the exact location of an undefined variable', () => {
  const result = analyzeSource('let total = age + 10;')

  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].line, 1)
  assert.equal(result.errors[0].column, 13)
})