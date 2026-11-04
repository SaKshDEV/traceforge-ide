
import test from 'node:test'
import assert from 'node:assert/strict'
import { tokenize } from '../dist/index.js'

test('recognizes keywords, identifiers and numbers', () => {
  const result = tokenize('let score = 42;')

  assert.deepEqual(
    result.tokens.map((token) => [
      token.kind,
      token.lexeme,
      token.literal,
    ]),
    [
      ['Let', 'let', null],
      ['Identifier', 'score', null],
      ['Equal', '=', null],
      ['Number', '42', 42],
      ['Semicolon', ';', null],
      ['EOF', '', null],
    ],
  )

  assert.deepEqual(result.errors, [])
})

test('recognizes decimal numbers', () => {
  const result = tokenize('let pi = 3.14;')

  const numberToken = result.tokens.find(
    (token) => token.kind === 'Number',
  )

  assert.equal(numberToken?.literal, 3.14)
  assert.deepEqual(result.errors, [])
})

test('recognizes strings and escape sequences', () => {
  const result = tokenize(String.raw`const message = "hello\nworld";`)

  const stringToken = result.tokens.find(
    (token) => token.kind === 'String',
  )

  assert.equal(stringToken?.literal, 'hello\nworld')
  assert.deepEqual(result.errors, [])
})

test('recognizes boolean and null keywords', () => {
  const result = tokenize('true false null')

  assert.deepEqual(
    result.tokens.slice(0, 3).map((token) => [
      token.kind,
      token.literal,
    ]),
    [
      ['True', true],
      ['False', false],
      ['Null', null],
    ],
  )
})

test('recognizes arithmetic and comparison operators', () => {
  const result = tokenize('+ - * / % = == ! != < <= > >=')

  assert.deepEqual(
    result.tokens.slice(0, -1).map((token) => token.kind),
    [
      'Plus',
      'Minus',
      'Star',
      'Slash',
      'Percent',
      'Equal',
      'EqualEqual',
      'Bang',
      'BangEqual',
      'Less',
      'LessEqual',
      'Greater',
      'GreaterEqual',
    ],
  )

  assert.deepEqual(result.errors, [])
})

test('recognizes logical operators', () => {
  const result = tokenize('&& ||')

  assert.deepEqual(
    result.tokens.slice(0, -1).map((token) => token.kind),
    ['AndAnd', 'OrOr'],
  )

  assert.deepEqual(result.errors, [])
})

test('ignores single-line comments', () => {
  const result = tokenize(
    'let score = 42; // this is a comment\nlet level = 5;',
  )

  const identifiers = result.tokens
    .filter((token) => token.kind === 'Identifier')
    .map((token) => token.lexeme)

  assert.deepEqual(identifiers, ['score', 'level'])
  assert.deepEqual(result.errors, [])
})

test('tracks line and column positions', () => {
  const result = tokenize('let score = 42;\nreturn score;')

  const returnToken = result.tokens.find(
    (token) => token.kind === 'Return',
  )

  assert.equal(returnToken?.line, 2)
  assert.equal(returnToken?.column, 1)
})

test('reports unexpected characters', () => {
  const result = tokenize('let @ = 42;')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    "Unexpected character '@'.",
  )
  assert.equal(result.errors[0].line, 1)
  assert.equal(result.errors[0].column, 5)
})

test('reports unterminated strings', () => {
  const result = tokenize('let name = "TraceForge')

  assert.equal(result.errors.length, 1)
  assert.equal(
    result.errors[0].message,
    'Unterminated string literal.',
  )
})

test('reports invalid logical operators', () => {
  const result = tokenize('& |')

  assert.equal(result.errors.length, 2)
  assert.equal(
    result.errors[0].message,
    "Use '&&' for the AND operator.",
  )
  assert.equal(
    result.errors[1].message,
    "Use '||' for the OR operator.",
  )
})
