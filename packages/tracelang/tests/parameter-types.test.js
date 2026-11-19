
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

test('infers number parameter types from arithmetic', () => {
  const { semantic } = compile(`
    fn add(a, b) {
      return a + b;
    }

    let result = add(10, 20);
    result + 5;
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports a string passed to a number parameter', () => {
  const { semantic } = compile(`
    fn add(a, b) {
      return a + b;
    }

    let result = add("Hello", 20);
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Argument 1 of function 'add' must be number, but got string.",
      ),
    ),
  )
})

test('infers string parameter types from string concatenation', () => {
  const { semantic } = compile(`
    fn greet(name) {
      return name + "!";
    }

    let message = greet("Saksham");
    message + " Welcome";
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports a number passed to a string parameter', () => {
  const { semantic } = compile(`
    fn greet(name) {
      return name + "!";
    }

    let message = greet(123);
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Argument 1 of function 'greet' must be string, but got number.",
      ),
    ),
  )
})

test('infers boolean parameter types from if conditions', () => {
  const { semantic } = compile(`
    fn check(value) {
      if (value) {
        return true;
      }

      return false;
    }

    let result = check(true);
    if (result) {
      let message = "Yes";
    }
  `)

  assert.deepEqual(semantic.errors, [])
})

test('infers number parameter types from comparisons', () => {
  const { semantic } = compile(`
    fn isPositive(value) {
      return value > 0;
    }

    let result = isPositive(10);
    if (result) {
      let message = "Positive";
    }
  `)

  assert.deepEqual(semantic.errors, [])
})

test('keeps a parameter unknown when its type cannot be inferred', () => {
  const { semantic } = compile(`
    fn identity(value) {
      return value;
    }

    let result = identity("Hello");
    result + 10;
  `)

  assert.deepEqual(semantic.errors, [])
})

test('checks multiple parameter types independently', () => {
  const { semantic } = compile(`
    fn describe(name, age) {
      let greeting = name + "!";
      return age + 1;
    }

    let result = describe("Saksham", 21);
    result + 5;
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports mismatches in multiple function arguments', () => {
  const { semantic } = compile(`
    fn describe(name, age) {
      let greeting = name + "!";
      return age + 1;
    }

    let result = describe(21, "Saksham");
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Argument 1 of function 'describe' must be string, but got number.",
      ),
    ),
  )

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Argument 2 of function 'describe' must be number, but got string.",
      ),
    ),
  )
})
