
export type TokenKind =
  // Identifiers and values
  | 'Identifier'
  | 'Number'
  | 'String'

  // Keywords
  | 'Let'
  | 'Const'
  | 'Fn'
  | 'Return'
  | 'If'
  | 'Else'
  | 'While'
  | 'True'
  | 'False'
  | 'Null'

  // Operators
  | 'Plus'
  | 'Minus'
  | 'Star'
  | 'Slash'
  | 'Percent'
  | 'Equal'
  | 'EqualEqual'
  | 'Bang'
  | 'BangEqual'
  | 'Less'
  | 'LessEqual'
  | 'Greater'
  | 'GreaterEqual'
  | 'AndAnd'
  | 'OrOr'

  // Punctuation
  | 'LeftParen'
  | 'RightParen'
  | 'LeftBrace'
  | 'RightBrace'
  | 'Comma'
  | 'Semicolon'
  | 'Colon'
  | 'Dot'

  // End of source code
  | 'EOF'

export type TokenLiteral =
  | string
  | number
  | boolean
  | null

export type Token = {
  kind: TokenKind
  lexeme: string
  literal: TokenLiteral
  line: number
  column: number
}
