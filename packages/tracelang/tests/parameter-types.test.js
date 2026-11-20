
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

// Existing tests: Automatic type inference

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

// New tests: Explicit parameter types

test('parses explicit parameter type annotations', () => {
  const { program } = compile(`
    fn add(a: number, b: number) {
      return a + b;
    }
  `)

  const fn = program.statements[0]

  assert.equal(fn.parameters[0].name.lexeme, 'a')
  assert.equal(fn.parameters[0].typeAnnotation.lexeme, 'number')

  assert.equal(fn.parameters[1].name.lexeme, 'b')
  assert.equal(fn.parameters[1].typeAnnotation.lexeme, 'number')
})

test('accepts explicitly typed number parameters', () => {
  const { semantic } = compile(`
    fn add(a: number, b: number) {
      return a + b;
    }

    let result = add(10, 20);
  `)

  assert.deepEqual(semantic.errors, [])
})

test('accepts explicitly typed string parameters', () => {
  const { semantic } = compile(`
    fn greet(name: string) {
      return name + "!";
    }

    let message = greet("Saksham");
  `)

  assert.deepEqual(semantic.errors, [])
})

test('accepts explicitly typed boolean parameters', () => {
  const { semantic } = compile(`
    fn check(active: boolean) {
      if (active) {
        return true;
      }

      return false;
    }

    let result = check(true);
  `)

  assert.deepEqual(semantic.errors, [])
})

test('reports a type mismatch for an explicitly typed parameter', () => {
  const { semantic } = compile(`
    fn add(a: number, b: number) {
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

test('reports an unsupported explicit parameter type', () => {
  const { semantic } = compile(`
    fn test(value: unknownType) {
      return value;
    }
  `)

  assert.ok(
    semantic.errors.some(error =>
      error.message.includes(
        "Unknown parameter type 'unknownType'. Expected number, string, or boolean.",
      ),
    ),
  )
})

test('rejects using a number parameter as a string', () => {
  const { semantic } = compile(`
    fn greet(count: number) {
      let message = count + "!";
    }
  `)

  assert.ok(semantic.errors.length > 0)
})

test('rejects using a string parameter in numeric arithmetic', () => {
  const { semantic } = compile(`
    fn calculate(value: string) {
      return value * 2;
    }
  `)

  assert.ok(semantic.errors.length > 0)
})
