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
test('reports multiple semantic errors with correct line and column', () => {
  const result = analyzeSource(
    'let first = missing;\nlet second = absent;',
  )

  assert.equal(result.errors.length, 2)

  assert.deepEqual(
    result.errors.map((error) => ({
      line: error.line,
      column: error.column,
    })),
    [
      { line: 1, column: 13 },
      { line: 2, column: 14 },
    ],
  )
})
test('warns when a variable is never used', () => {
  const result = analyzeSource('let age = 21;')

  assert.equal(result.errors.length, 0)
  assert.equal(result.warnings.length, 1)
  assert.equal(
    result.warnings[0].message,
    "Variable 'age' is declared but never used.",
  )
})

test('does not warn when a variable is used', () => {
  const result = analyzeSource(`
    let age = 21;
    let total = age + 10;
    total;
  `)

  assert.equal(result.errors.length, 0)
  assert.equal(result.warnings.length, 0)
})

test('accepts arithmetic with numbers', () => {
  const result = analyzeSource('let total = 10 + 20;')

  assert.equal(result.errors.length, 0)
})

test('accepts string concatenation', () => {
  const result = analyzeSource(
    'let message = "hello" + " world";',
  )

  assert.equal(result.errors.length, 0)
})

test('reports incompatible arithmetic types', () => {
  const result = analyzeSource('let result = 10 + "hello";')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    "Operator '+' requires two numbers.",
  )
})

test('reports invalid unary operand types', () => {
  const result = analyzeSource('let result = -"hello";')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    "Unary '-' requires a number.",
  )
})

test('accepts numeric comparisons', () => {
  const result = analyzeSource('let result = 10 > 5;')

  assert.equal(result.errors.length, 0)
})

test('reports equality between incompatible types', () => {
  const result = analyzeSource('let result = 10 == "hello";')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    'Equality operands must have matching types.',
  )
})
