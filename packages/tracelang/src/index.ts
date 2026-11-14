
export { Lexer, tokenize } from './lexer.js'
export type { LexError, LexResult } from './lexer.js'

export { SemanticAnalyzer, analyze } from './semantic.js'
export type {
  SemanticError,
  SemanticResult,
  SemanticWarning,
} from './semantic.js'

export { Parser, parseTokens } from './parser.js'
export type { ParseError, ParseResult } from './parser.js'

export type {
  Program,
  Statement,
  VariableDeclaration,
  ExpressionStatement,
  IfStatement,
  WhileStatement,
  Expression,
  LiteralExpression,
  IdentifierExpression,
  GroupingExpression,
  UnaryExpression,
  BinaryExpression,
} from './ast.js'

export type {
  Token,
  TokenKind,
  TokenLiteral,
} from './token.js'
