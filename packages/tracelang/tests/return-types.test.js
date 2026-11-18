
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

test('infers number as a function return type', () => {
  const { semantic } = compile(`
    fn getAge() {
      return 21;
    }

    let age = getAge();
    age + 5;
  `)

  assert.deepEqual(semantic.errors, [])
})

test('infers string as a function return type', () => {
  const { semantic } = compile(`
    fn getName() {
      return "Saksham";
    }

    let name = getName();
    name + " Gulati";
  `)

  assert.deepEqual(semantic.errors, [])
})

test('infers boolean as a function return type', () => {
  const { semantic } = compile(`
    fn isReady() {
      return true;
    }

    if (isReady()) {
      let message = "Ready";
    }
  `)

  assert.deepEqual(semantic.errors, [])
})

test('infers void when a function has no return statement', () => {
  const { semantic } = compile(`
    fn greet() {
      let message = "Hello";
    }

    let result = greet();
    result + 10;
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Operator '+' requires two numbers.",
      ),
    ),
  )
})

test('infers void for a return statement without a value', () => {
  const { semantic } = compile(`
    fn stop() {
      return;
    }

    let result = stop();
    result + 10;
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Operator '+' requires two numbers.",
      ),
    ),
  )
})

test('accepts multiple return statements with the same type', () => {
  const { semantic } = compile(`
    fn calculate() {
      if (true) {
        return 10;
      }

      return 20;
    }

    let result = calculate();
    result + 5;
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports inconsistent return types', () => {
  const { semantic } = compile(`
    fn calculate() {
      if (true) {
        return 10;
      }

      return "Hello";
    }
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Function 'calculate' has inconsistent return types: number and string.",
      ),
    ),
  )
})

test('keeps return type collection separate for nested functions', () => {
  const { semantic } = compile(`
    fn outer() {
      fn inner() {
        return "Hello";
      }

      return 10;
    }

    let result = outer();
    result + 5;
  `)

  assert.deepEqual(semantic.errors, [])
})
