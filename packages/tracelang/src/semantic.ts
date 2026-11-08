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

export class SemanticAnalyzer {
  private declaredVariables = new Map<string, Token>()
  private errors: SemanticError[] = []

  private warnings: SemanticWarning[] = []
  private usedVariables = new Set<string>()

  analyze(program: Program): SemanticResult {
    this.declaredVariables.clear()
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
      this.analyzeExpression(statement.expression)
    }
  }

  private analyzeVariableDeclaration(
    declaration: Extract<Statement, { kind: 'VariableDeclaration' }>,
  ): void {
    const variableName = declaration.name.lexeme

    // Check the initializer before declaring the variable.
    if (declaration.initializer !== null) {
      this.analyzeExpression(declaration.initializer)
    }

    // Check whether this variable was already declared.
    if (this.declaredVariables.has(variableName)) {
      this.addError(
        `Variable '${variableName}' is already declared.`,
        declaration.name,
      )
      return
    }

    // Store the variable after successful declaration.
    this.declaredVariables.set(variableName, declaration.name)
  }

  private analyzeExpression(expression: Expression): void {
    switch (expression.kind) {
      case 'LiteralExpression':
        return

      case 'IdentifierExpression': {
        const variableName = expression.name.lexeme

        if (!this.declaredVariables.has(variableName)) {
          this.addError(
            `Variable '${variableName}' is not declared.`,
            expression.name,
          )
        } else {
          this.usedVariables.add(variableName)
        }

        return
      }

      case 'GroupingExpression':
        this.analyzeExpression(expression.expression)
        return

      case 'UnaryExpression':
        this.analyzeExpression(expression.right)
        return

      case 'BinaryExpression':
        this.analyzeExpression(expression.left)
        this.analyzeExpression(expression.right)
        return
    }
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