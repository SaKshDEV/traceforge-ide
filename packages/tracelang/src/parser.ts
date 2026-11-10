
import type {
  Expression,
  Program,
  Statement,
} from './ast.js'

import type {
  Token,
  TokenKind,
} from './token.js'

export type ParseError = {
  message: string
  line: number
  column: number
}

export type ParseResult = {
  program: Program
  errors: ParseError[]
}

class ParseFailure extends Error {
  constructor(
    message: string,
    readonly token: Token,
  ) {
    super(message)
    this.name = 'ParseFailure'
  }
}

export class Parser {
  private current = 0
  private readonly errors: ParseError[] = []

  constructor(private readonly tokens: Token[]) {}

  parse(): ParseResult {
    const statements: Statement[] = []

    while (!this.isAtEnd()) {
      const statement = this.parseDeclaration()

      if (statement !== null) {
        statements.push(statement)
      }
    }

    return {
      program: {
        kind: 'Program',
        statements,
      },
      errors: this.errors,
    }
  }

  private parseDeclaration(): Statement | null {
    const declarationStart = this.current

    try {
      if (this.match('If')) {
        return this.ifStatement()
      }

      if (this.match('Let', 'Const')) {
        return this.variableDeclaration(this.previous())
      }

      return this.expressionStatement()
    } catch (error) {
      if (!(error instanceof ParseFailure)) {
        throw error
      }

      this.errors.push({
        message: error.message,
        line: error.token.line,
        column: error.token.column,
      })

      if (this.current === declarationStart && !this.isAtEnd()) {
        this.advance()
      }

      this.synchronize()
      return null
    }
  }

  private variableDeclaration(keyword: Token): Statement {
    const name = this.consume(
      'Identifier',
      'Expected a variable name after declaration keyword.',
    )

    let initializer: Expression | null = null

    if (this.match('Equal')) {
      initializer = this.expression()
    }

    if (keyword.kind === 'Const' && initializer === null) {
      throw new ParseFailure(
        'A constant declaration must have an initializer.',
        name,
      )
    }

    this.consume(
      'Semicolon',
      "Expected ';' after variable declaration.",
    )

    return {
      kind: 'VariableDeclaration',
      declarationKind: keyword.kind === 'Const' ? 'Const' : 'Let',
      name,
      initializer,
    }
  }

  private expressionStatement(): Statement {
    const expression = this.expression()

    this.consume(
      'Semicolon',
      "Expected ';' after expression.",
    )

    return {
      kind: 'ExpressionStatement',
      expression,
    }
  }

  // Parse if (condition) { ... } else { ... }
  private ifStatement(): Statement {
    this.consume(
      'LeftParen',
      "Expected '(' after 'if'.",
    )

    const condition = this.expression()

    this.consume(
      'RightParen',
      "Expected ')' after if condition.",
    )

    const thenBranch = this.block()

    let elseBranch: Statement[] | null = null

    if (this.match('Else')) {
      elseBranch = this.block()
    }

    return {
      kind: 'IfStatement',
      condition,
      thenBranch,
      elseBranch,
    }
  }

  // Parse statements between opening and closing braces.
  private block(): Statement[] {
    this.consume(
      'LeftBrace',
      "Expected '{' before block.",
    )

    const statements: Statement[] = []

    while (!this.check('RightBrace') && !this.isAtEnd()) {
      const statement = this.parseDeclaration()

      if (statement !== null) {
        statements.push(statement)
      }
    }

    this.consume(
      'RightBrace',
      "Expected '}' after block.",
    )

    return statements
  }

  private expression(): Expression {
    return this.equality()
  }

  private equality(): Expression {
    let expression = this.comparison()

    while (this.match('EqualEqual', 'BangEqual')) {
      const operator = this.previous()
      const right = this.comparison()

      expression = {
        kind: 'BinaryExpression',
        left: expression,
        operator,
        right,
      }
    }

    return expression
  }

  private comparison(): Expression {
    let expression = this.term()

    while (
      this.match(
        'Greater',
        'GreaterEqual',
        'Less',
        'LessEqual',
      )
    ) {
      const operator = this.previous()
      const right = this.term()

      expression = {
        kind: 'BinaryExpression',
        left: expression,
        operator,
        right,
      }
    }

    return expression
  }

  private term(): Expression {
    let expression = this.factor()

    while (this.match('Plus', 'Minus')) {
      const operator = this.previous()
      const right = this.factor()

      expression = {
        kind: 'BinaryExpression',
        left: expression,
        operator,
        right,
      }
    }

    return expression
  }

  private factor(): Expression {
    let expression = this.unary()

    while (this.match('Star', 'Slash', 'Percent')) {
      const operator = this.previous()
      const right = this.unary()

      expression = {
        kind: 'BinaryExpression',
        left: expression,
        operator,
        right,
      }
    }

    return expression
  }

  private unary(): Expression {
    if (this.match('Bang', 'Minus')) {
      const operator = this.previous()
      const right = this.unary()

      return {
        kind: 'UnaryExpression',
        operator,
        right,
      }
    }

    return this.primary()
  }

  private primary(): Expression {
    if (this.match('Number', 'String')) {
      return {
        kind: 'LiteralExpression',
        value: this.previous().literal,
      }
    }

    if (this.match('True')) {
      return {
        kind: 'LiteralExpression',
        value: true,
      }
    }

    if (this.match('False')) {
      return {
        kind: 'LiteralExpression',
        value: false,
      }
    }

    if (this.match('Null')) {
      return {
        kind: 'LiteralExpression',
        value: null,
      }
    }

    if (this.match('Identifier')) {
      return {
        kind: 'IdentifierExpression',
        name: this.previous(),
      }
    }

    if (this.match('LeftParen')) {
      const expression = this.expression()

      this.consume(
        'RightParen',
        "Expected ')' after expression.",
      )

      return {
        kind: 'GroupingExpression',
        expression,
      }
    }

    throw new ParseFailure(
      'Expected an expression.',
      this.peek(),
    )
  }

  private match(...kinds: TokenKind[]): boolean {
    for (const kind of kinds) {
      if (this.check(kind)) {
        this.advance()
        return true
      }
    }

    return false
  }

  private check(kind: TokenKind): boolean {
    if (this.isAtEnd()) {
      return kind === 'EOF'
    }

    return this.peek().kind === kind
  }

  private consume(
    kind: TokenKind,
    message: string,
  ): Token {
    if (this.check(kind)) {
      return this.advance()
    }

    throw new ParseFailure(message, this.peek())
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1
    }

    return this.previous()
  }

  private isAtEnd(): boolean {
    return this.peek().kind === 'EOF'
  }

  private peek(): Token {
    return this.tokens[this.current]!
  }

  private previous(): Token {
    return this.tokens[this.current - 1]!
  }

  private synchronize(): void {
    while (!this.isAtEnd()) {
      if (this.previous().kind === 'Semicolon') {
        return
      }

      if (
        this.check('Let') ||
        this.check('Const') ||
        this.check('Fn') ||
        this.check('If') ||
        this.check('While') ||
        this.check('Return') ||
        this.check('RightBrace')
      ) {
        return
      }

      this.advance()
    }
  }
}

export function parseTokens(tokens: Token[]): ParseResult {
  return new Parser(tokens).parse()
}
