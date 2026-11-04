
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

// Internal error used to recover from invalid syntax.
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

  // Start parsing the entire token list.
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

  // Parse a variable declaration or expression statement.
  private parseDeclaration(): Statement | null {
    const declarationStart = this.current

    try {
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

      // Make sure the parser always makes progress.
      if (this.current === declarationStart && !this.isAtEnd()) {
        this.advance()
      }

      this.synchronize()

      return null
    }
  }

  // Parse: let name = expression;
  // Parse: const name = expression;
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

  // Parse: expression;
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

  // Expression parsing starts at the lowest precedence.
  private expression(): Expression {
    return this.equality()
  }

  // Equality: == !=
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

  // Comparison: < <= > >=
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

  // Addition and subtraction: + -
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

  // Multiplication, division and remainder: * / %
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

  // Unary expressions: !value and -value
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

  // Values, identifiers and grouped expressions.
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

  // Check whether the next token matches any supplied kind.
  private match(...kinds: TokenKind[]): boolean {
    for (const kind of kinds) {
      if (this.check(kind)) {
        this.advance()
        return true
      }
    }

    return false
  }

  // Check the next token without consuming it.
  private check(kind: TokenKind): boolean {
    if (this.isAtEnd()) {
      return kind === 'EOF'
    }

    return this.peek().kind === kind
  }

  // Consume a required token or report an error.
  private consume(
    kind: TokenKind,
    message: string,
  ): Token {
    if (this.check(kind)) {
      return this.advance()
    }

    throw new ParseFailure(message, this.peek())
  }

  // Move to the next token.
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

  // Continue parsing from the next likely statement.
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
        this.check('Return')
      ) {
        return
      }

      this.advance()
    }
  }
}

// Public helper: convert tokens into an AST.
export function parseTokens(tokens: Token[]): ParseResult {
  return new Parser(tokens).parse()
}
