
import test from 'node:test'
import assert from 'node:assert/strict'

import { tokenize, parseTokens, analyze } from '../dist/index.js'

function compile(source) {
    const lexResult = tokenize(source)

    if (lexResult.errors.length > 0) {
        return { errors: lexResult.errors }
    }

    const parseResult = parseTokens(lexResult.tokens)

    if (parseResult.errors.length > 0) {
        return { errors: parseResult.errors }
    }

    return analyze(parseResult.program)
}

test('accepts a function with a matching explicit return type', () => {
    const result = compile(`
    fn add(a: number, b: number): number {
      return a + b;
    }
  `)

    assert.equal(result.errors.length, 0)
})

test('reports an error when the returned type does not match', () => {
    const result = compile(`
    fn add(a: number, b: number): string {
      return a + b;
    }
  `)

    assert.ok(
        result.errors.some(error =>
            error.message.includes(
                "declares return type 'string' but returns 'number'",
            ),
        ),
    )
})

test('accepts string return type when returning a string', () => {
    const result = compile(`
    fn greet(): string {
      return "Hello";
    }
  `)

    assert.equal(result.errors.length, 0)
})

test('accepts boolean return type when returning a boolean', () => {
    const result = compile(`
    fn isReady(): boolean {
      return true;
    }
  `)

    assert.equal(result.errors.length, 0)
})

test('reports an error for an unsupported return type', () => {
    const result = compile(`
    fn getValue(): car {
      return 10;
    }
  `)

    assert.ok(
        result.errors.some(error =>
            error.message.includes("Unknown return type 'car'"),
        ),
    )
})

test('keeps automatic return type inference without an annotation', () => {
  const result = compile(`
    fn add(a: number, b: number) {
      return a + b;
    }

    let answer = add(10, 20);
    answer + 5;
  `)

  assert.equal(result.errors.length, 0)
})