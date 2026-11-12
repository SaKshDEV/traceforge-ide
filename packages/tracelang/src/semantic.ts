
import type {
  Program,
  Statement,
  Expression,
} from './ast.js'

import type { Token } from './token.js'

export type SemanticError = {
  message: string
  line: number
  column: number
}

export type SemanticWarning = {
  message: string
  line: number
  column: number
}

export type SemanticResult = {
  errors: SemanticError[]
  warnings: SemanticWarning[]
}

type ValueType = 'number' | 'string' | 'boolean' | 'null' | 'unknown'

type VariableInfo = {
  token: Token
  type: ValueType
  used: boolean
}

export class SemanticAnalyzer {
  private scopes: Map<string, VariableInfo>[] = []
  private errors: SemanticError[] = []
  private warnings: SemanticWarning[] = []

  analyze(program: Program): SemanticResult {
    this.scopes = []
    this.errors = []
    this.warnings = []

    this.beginScope()

    for (const statement of program.statements) {
      this.analyzeStatement(statement)
    }

    this.endScope()

    return {
      errors: this.errors,
      warnings: this.warnings,
    }
  }

  private beginScope(): void {
    this.scopes.push(new Map())
  }

  private endScope(): void {
    const scope = this.scopes.pop()

    if (!scope) return

    for (const [name, variable] of scope) {
      if (!variable.used) {
        this.warnings.push({
          message: `Variable '${name}' is declared but never used.`,
          line: variable.token.line,
          column: variable.token.column,
        })
      }
    }
  }

  private declareVariable(
    name: string,
    token: Token,
    type: ValueType,
  ): void {
    const currentScope = this.scopes[this.scopes.length - 1]

    if (!currentScope) return

    if (currentScope.has(name)) {
      this.addError(
        `Variable '${name}' is already declared.`,
        token,
      )
      return
    }

    currentScope.set(name, {
      token,
      type,
      used: false,
    })
  }

  private resolveVariable(name: string): VariableInfo | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const variable = this.scopes[i]?.get(name)

      if (variable) {
        return variable
      }
    }

    return undefined
  }

  private analyzeStatement(statement: Statement): void {
    if (statement.kind === 'VariableDeclaration') {
      this.analyzeVariableDeclaration(statement)
      return
    }

    if (statement.kind === 'ExpressionStatement') {
      this.inferExpressionType(statement.expression)
      return
    }

    if (statement.kind === 'IfStatement') {
      const conditionType = this.inferExpressionType(
        statement.condition,
      )

      if (
        conditionType !== 'boolean' &&
        conditionType !== 'unknown'
      ) {
        this.addError(
          'If condition must be a boolean.',
          this.getExpressionToken(statement.condition),
        )
      }

      this.beginScope()

      for (const child of statement.thenBranch) {
        this.analyzeStatement(child)
      }

      this.endScope()

      if (statement.elseBranch !== null) {
        this.beginScope()

        for (const child of statement.elseBranch) {
          this.analyzeStatement(child)
        }

        this.endScope()
      }
    }
  }

  private analyzeVariableDeclaration(
    declaration: Extract<Statement, { kind: 'VariableDeclaration' }>,
  ): void {
    const inferredType =
      declaration.initializer === null
        ? 'unknown'
        : this.inferExpressionType(declaration.initializer)

    this.declareVariable(
      declaration.name.lexeme,
      declaration.name,
      inferredType,
    )
  }

  private inferExpressionType(expression: Expression): ValueType {
    switch (expression.kind) {
      case 'LiteralExpression':
        return this.getLiteralType(expression.value)

      case 'IdentifierExpression': {
        const variable = this.resolveVariable(
          expression.name.lexeme,
        )

        if (!variable) {
          this.addError(
            `Variable '${expression.name.lexeme}' is not declared.`,
            expression.name,
          )
          return 'unknown'
        }

        variable.used = true
        return variable.type
      }

      case 'GroupingExpression':
        return this.inferExpressionType(expression.expression)

      case 'UnaryExpression': {
        const rightType = this.inferExpressionType(expression.right)

        if (expression.operator.kind === 'Minus') {
          if (rightType !== 'number' && rightType !== 'unknown') {
            this.addError(
              "Unary '-' requires a number.",
              expression.operator,
            )
          }

          return 'number'
        }

        if (expression.operator.kind === 'Bang') {
          if (rightType !== 'boolean' && rightType !== 'unknown') {
            this.addError(
              "Unary '!' requires a boolean.",
              expression.operator,
            )
          }

          return 'boolean'
        }

        return 'unknown'
      }

      case 'BinaryExpression': {
        const leftType = this.inferExpressionType(expression.left)
        const rightType = this.inferExpressionType(expression.right)
        const operator = expression.operator

        if (
          operator.kind === 'Plus' ||
          operator.kind === 'Minus' ||
          operator.kind === 'Star' ||
          operator.kind === 'Slash' ||
          operator.kind === 'Percent'
        ) {
          if (
            operator.kind === 'Plus' &&
            leftType === 'string' &&
            rightType === 'string'
          ) {
            return 'string'
          }

          if (
            (leftType !== 'number' && leftType !== 'unknown') ||
            (rightType !== 'number' && rightType !== 'unknown')
          ) {
            this.addError(
              `Operator '${operator.lexeme}' requires two numbers.`,
              operator,
            )
          }

          return 'number'
        }

        if (
          operator.kind === 'Greater' ||
          operator.kind === 'GreaterEqual' ||
          operator.kind === 'Less' ||
          operator.kind === 'LessEqual'
        ) {
          if (
            (leftType !== 'number' && leftType !== 'unknown') ||
            (rightType !== 'number' && rightType !== 'unknown')
          ) {
            this.addError(
              `Operator '${operator.lexeme}' requires two numbers.`,
              operator,
            )
          }

          return 'boolean'
        }

        if (
          operator.kind === 'EqualEqual' ||
          operator.kind === 'BangEqual'
        ) {
          if (
            leftType !== 'unknown' &&
            rightType !== 'unknown' &&
            leftType !== rightType
          ) {
            this.addError(
              'Equality operands must have matching types.',
              operator,
            )
          }

          return 'boolean'
        }

        return 'unknown'
    }
    }

    return 'unknown'
  }

  private getExpressionToken(expression: Expression): Token {
    switch (expression.kind) {
      case 'LiteralExpression':
        return {
          kind: 'EOF',
          lexeme: '',
          literal: null,
          line: 1,
          column: 1,
        }

      case 'IdentifierExpression':
        return expression.name

      case 'GroupingExpression':
        return this.getExpressionToken(expression.expression)

      case 'UnaryExpression':
        return expression.operator

      case 'BinaryExpression':
        return expression.operator
    }
  }

  private getLiteralType(value: string | number | boolean | null): ValueType {
    if (typeof value === 'number') return 'number'
    if (typeof value === 'string') return 'string'
    if (typeof value === 'boolean') return 'boolean'
    return 'null'
  }

  private addError(message: string, token: Token): void {
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
    })
  }
}

export function analyze(program: Program): SemanticResult {
  const analyzer = new SemanticAnalyzer()
  return analyzer.analyze(program)
}
