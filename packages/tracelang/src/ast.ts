import type { Token, TokenLiteral } from './token.js'

export type Program = {
  kind: 'Program'
  statements: Statement[]
}

export type Statement =
  | VariableDeclaration
  | ExpressionStatement
  | IfStatement

export type VariableDeclaration = {
  kind: 'VariableDeclaration'
  declarationKind: 'Let' | 'Const'
  name: Token
  initializer: Expression | null
}

export type ExpressionStatement = {
  kind: 'ExpressionStatement'
  expression: Expression
}

export type IfStatement = {
  kind: 'IfStatement'
  condition: Expression
  thenBranch: Statement[]
  elseBranch: Statement[] | null
}

export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | GroupingExpression
  | UnaryExpression
  | BinaryExpression

export type LiteralExpression = {
  kind: 'LiteralExpression'
  value: TokenLiteral
}

export type IdentifierExpression = {
  kind: 'IdentifierExpression'
  name: Token
}

export type GroupingExpression = {
  kind: 'GroupingExpression'
  expression: Expression
}

export type UnaryExpression = {
  kind: 'UnaryExpression'
  operator: Token
  right: Expression
}

export type BinaryExpression = {
  kind: 'BinaryExpression'
  left: Expression
  operator: Token
  right: Expression
}