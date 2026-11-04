
import test from 'node:test'
import assert from 'node:assert/strict'
import { tokenize, parseTokens } from '../dist/index.js'

function parse(source) {
  const lexResult = tokenize(source)

  assert.deepEqual(lexResult.errors, [])

  return parseTokens(lexResult.tokens)
}

test('parses a variable declaration', () => {
  const result = parse('let score = 42;')

  assert.deepEqual(result.errors, [])

  const declaration = result.program.statements[0]

  assert.equal(declaration.kind, 'VariableDeclaration')
  assert.equal(declaration.declarationKind, 'Let')
  assert.equal(declaration.name.lexeme, 'score')
  assert.equal(declaration.initializer.kind, 'LiteralExpression')
  assert.equal(declaration.initializer.value, 42)
})

test('parses constant declarations', () => {
  const result = parse('const age = 21;')

  assert.deepEqual(result.errors, [])

  const declaration = result.program.statements[0]

  assert.equal(declaration.kind, 'VariableDeclaration')
  assert.equal(declaration.declarationKind, 'Const')
  assert.equal(declaration.initializer.value, 21)
})

test('respects multiplication precedence', () => {
  const result = parse('let result = 1 + 2 * 3;')

  assert.deepEqual(result.errors, [])

  const declaration = result.program.statements[0]
  const expression = declaration.initializer

  assert.equal(expression.kind, 'BinaryExpression')
  assert.equal(expression.operator.lexeme, '+')
  assert.equal(expression.left.value, 1)

  assert.equal(expression.right.kind, 'BinaryExpression')
  assert.equal(expression.right.operator.lexeme, '*')
  assert.equal(expression.right.left.value, 2)
  assert.equal(expression.right.right.value, 3)
})

test('respects parentheses', () => {
  const result = parse('let result = (1 + 2) * 3;')

  assert.deepEqual(result.errors, [])

  const declaration = result.program.statements[0]
  const expression = declaration.initializer

  assert.equal(expression.operator.lexeme, '*')
  assert.equal(expression.left.kind, 'GroupingExpression')
})

test('parses unary expressions', () => {
  const result = parse('let result = -42;')

  assert.deepEqual(result.errors, [])

  const declaration = result.program.statements[0]
  const expression = declaration.initializer

  assert.equal(expression.kind, 'UnaryExpression')
  assert.equal(expression.operator.lexeme, '-')
  assert.equal(expression.right.value, 42)
})

test('parses expression statements', () => {
  const result = parse('score;')

  assert.deepEqual(result.errors, [])

  assert.equal(
    result.program.statements[0].kind,
    'ExpressionStatement',
  )

  assert.equal(
    result.program.statements[0].expression.name.lexeme,
    'score',
  )
})

test('reports a missing semicolon', () => {
  const result = parse('let score = 42')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    "Expected ';' after variable declaration.",
  )
})

test('requires an initializer for constants', () => {
  const result = parse('const score;')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    'A constant declaration must have an initializer.',
  )
})

test('reports a missing closing parenthesis', () => {
  const result = parse('let score = (10 + 20;')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    "Expected ')' after expression.",
  )
})
