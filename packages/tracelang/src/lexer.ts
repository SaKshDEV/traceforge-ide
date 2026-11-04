
import type { Token, TokenKind, TokenLiteral } from './token.js'

const KEYWORDS: Record<string, TokenKind> = {
  let: 'Let',
  const: 'Const',
  fn: 'Fn',
  return: 'Return',
  if: 'If',
  else: 'Else',
  while: 'While',
  true: 'True',
  false: 'False',
  null: 'Null',
}

export type LexError = {
  message: string
  line: number
  column: number
}

export type LexResult = {
  tokens: Token[]
  errors: LexError[]
}

export class Lexer {
  private readonly tokens: Token[] = []
  private readonly errors: LexError[] = []

  private start = 0
  private current = 0

  private line = 1
  private column = 1

  private tokenLine = 1
  private tokenColumn = 1

  constructor(private readonly source: string) {}

  scanTokens(): LexResult {
    while (!this.isAtEnd()) {
      this.start = this.current
      this.tokenLine = this.line
      this.tokenColumn = this.column

      this.scanToken()
    }

    this.tokens.push({
      kind: 'EOF',
      lexeme: '',
      literal: null,
      line: this.line,
      column: this.column,
    })

    return {
      tokens: this.tokens,
      errors: this.errors,
    }
  }

  private scanToken(): void {
    const char = this.advance()

    switch (char) {
      case '(':
        this.addToken('LeftParen')
        return

      case ')':
        this.addToken('RightParen')
        return

      case '{':
        this.addToken('LeftBrace')
        return

      case '}':
        this.addToken('RightBrace')
        return

      case ',':
        this.addToken('Comma')
        return

      case ';':
        this.addToken('Semicolon')
        return

      case ':':
        this.addToken('Colon')
        return

      case '.':
        this.addToken('Dot')
        return

      case '+':
        this.addToken('Plus')
        return

      case '-':
        this.addToken('Minus')
        return

      case '*':
        this.addToken('Star')
        return

      case '%':
        this.addToken('Percent')
        return

      case '!':
        this.addToken(
          this.match('=') ? 'BangEqual' : 'Bang',
        )
        return

      case '=':
        this.addToken(
          this.match('=') ? 'EqualEqual' : 'Equal',
        )
        return

      case '<':
        this.addToken(
          this.match('=') ? 'LessEqual' : 'Less',
        )
        return

      case '>':
        this.addToken(
          this.match('=') ? 'GreaterEqual' : 'Greater',
        )
        return

      case '&':
        if (this.match('&')) {
          this.addToken('AndAnd')
        } else {
          this.addError("Use '&&' for the AND operator.")
        }
        return

      case '|':
        if (this.match('|')) {
          this.addToken('OrOr')
        } else {
          this.addError("Use '||' for the OR operator.")
        }
        return

      case '/':
        if (this.match('/')) {
          
          while (this.peek() !== '\n' && !this.isAtEnd()) {
            this.advance()
          }
        } else {
          this.addToken('Slash')
        }
        return

      case '"':
        this.scanString()
        return

      case ' ':
      case '\r':
      case '\t':
      case '\n':
        return

      default:
        if (this.isDigit(char)) {
          this.scanNumber()
          return
        }

        if (this.isAlpha(char)) {
          this.scanIdentifier()
          return
        }

        this.addError(`Unexpected character '${char}'.`)
    }
  }

  private scanString(): void {
    let value = ''

    while (this.peek() !== '"' && !this.isAtEnd()) {
      const char = this.advance()

      if (char === '\\') {
        if (this.isAtEnd()) {
          break
        }

        const escaped = this.advance()

        switch (escaped) {
          case 'n':
            value += '\n'
            break

          case 'r':
            value += '\r'
            break

          case 't':
            value += '\t'
            break

          case '"':
            value += '"'
            break

          case '\\':
            value += '\\'
            break

          default:
            this.addError(`Invalid escape sequence '\\${escaped}'.`)
            value += escaped
        }
      } else {
        value += char
      }
    }

    if (this.isAtEnd()) {
      this.addError('Unterminated string literal.')
      return
    }

    this.advance()

    this.addToken('String', value)
  }

  private scanNumber(): void {
    while (this.isDigit(this.peek())) {
      this.advance()
    }

    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance()

      while (this.isDigit(this.peek())) {
        this.advance()
      }
    }

    const value = Number(
      this.source.slice(this.start, this.current),
    )

    this.addToken('Number', value)
  }

  private scanIdentifier(): void {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance()
    }

    const text = this.source.slice(this.start, this.current)
    const kind = KEYWORDS[text] ?? 'Identifier'

    let literal: TokenLiteral = null

    if (kind === 'True') {
      literal = true
    } else if (kind === 'False') {
      literal = false
    }

    this.addToken(kind, literal)
  }

  private addToken(
    kind: TokenKind,
    literal: TokenLiteral = null,
  ): void {
    const lexeme = this.source.slice(this.start, this.current)

    this.tokens.push({
      kind,
      lexeme,
      literal,
      line: this.tokenLine,
      column: this.tokenColumn,
    })
  }

  private addError(message: string): void {
    this.errors.push({
      message,
      line: this.tokenLine,
      column: this.tokenColumn,
    })
  }

  private advance(): string {
    const char = this.source[this.current]

    this.current += 1

    if (char === '\n') {
      this.line += 1
      this.column = 1
    } else {
      this.column += 1
    }

    return char
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) {
      return false
    }

    if (this.source[this.current] !== expected) {
      return false
    }

    this.advance()
    return true
  }

  private peek(): string {
    if (this.isAtEnd()) {
      return '\0'
    }

    return this.source[this.current]
  }

  private peekNext(): string {
    if (this.current + 1 >= this.source.length) {
      return '\0'
    }

    return this.source[this.current + 1]
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length
  }

  private isDigit(char: string): boolean {
    return /[0-9]/.test(char)
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z_]/.test(char)
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char)
  }
}

export function tokenize(source: string): LexResult {
  return new Lexer(source).scanTokens()
}
