
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

export class SemanticAnalyzer {
  private declaredVariables = new Map<string, Token>()
  private variableTypes = new Map<string, ValueType>()
  private errors: SemanticError[] = []
  private warnings: SemanticWarning[] = []
  private usedVariables = new Set<string>()

  analyze(program: Program): SemanticResult {
    this.declaredVariables.clear()
    this.variableTypes.clear()
    this.errors = []
    this.warnings = []
    this.usedVariables.clear()

    for (const statement of program.statements) {
      this.analyzeStatement(statement)
    }

    for (const [name, token] of this.declaredVariables) {
      if (!this.usedVariables.has(name)) {
        this.warnings.push({
          message: `Variable '${name}' is declared but never used.`,
          line: token.line,
          column: token.column,
        })
      }
    }

    return {
      errors: this.errors,
      warnings: this.warnings,
    }
  }

  private analyzeStatement(statement: Statement): void {
    if (statement.kind === 'VariableDeclaration') {
      this.analyzeVariableDeclaration(statement)
      return
    }

    if (statement.kind === 'ExpressionStatement') {
      this.inferExpressionType(statement.expression)
    }
  }

  private analyzeVariableDeclaration(
    declaration: Extract<Statement, { kind: 'VariableDeclaration' }>,
  ): void {
    const variableName = declaration.name.lexeme

    const inferredType =
      declaration.initializer === null
        ? 'unknown'
        : this.inferExpressionType(declaration.initializer)

    if (this.declaredVariables.has(variableName)) {
      this.addError(
        `Variable '${variableName}' is already declared.`,
        declaration.name,
      )
      return
    }

    this.declaredVariables.set(variableName, declaration.name)
    this.variableTypes.set(variableName, inferredType)
  }

  private inferExpressionType(expression: Expression): ValueType {
    switch (expression.kind) {
      case 'LiteralExpression':
        return this.getLiteralType(expression.value)

      case 'IdentifierExpression': {
        const variableName = expression.name.lexeme

        if (!this.declaredVariables.has(variableName)) {
          this.addError(
            `Variable '${variableName}' is not declared.`,
            expression.name,
          )
          return 'unknown'
        }

        this.usedVariables.add(variableName)
        return this.variableTypes.get(variableName) ?? 'unknown'
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
