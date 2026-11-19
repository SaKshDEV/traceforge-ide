
import type {
  Expression,
  Program,
  Statement,
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

type ValueType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'null'
  | 'void'
  | 'unknown'

type VariableInfo = {
  token: Token
  type: ValueType
  used: boolean
  isParameter: boolean
}

type FunctionInfo = {
  token: Token
  parameterCount: number
  parameterTypes: ValueType[]
  returnType: ValueType
}

export class SemanticAnalyzer {
  private scopes: Map<string, VariableInfo>[] = []
  private errors: SemanticError[] = []
  private warnings: SemanticWarning[] = []
  private functions = new Map<string, FunctionInfo>()
  private functionDepth = 0
  private functionReturnTypes: ValueType[][] = []

  analyze(program: Program): SemanticResult {
    this.scopes = []
    this.errors = []
    this.warnings = []
    this.functions = new Map()
    this.functionDepth = 0
    this.functionReturnTypes = []

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
    isParameter = false,
  ): VariableInfo | undefined {
    const currentScope = this.scopes[this.scopes.length - 1]

    if (!currentScope) return undefined

    if (currentScope.has(name)) {
      this.addError(
        `Variable '${name}' is already declared.`,
        token,
      )
      return undefined
    }

    const variable: VariableInfo = {
      token,
      type,
      used: false,
      isParameter,
    }

    currentScope.set(name, variable)

    return variable
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


  private getKnownExpressionType(expression: Expression): ValueType {
    switch (expression.kind) {
      case 'LiteralExpression':
        return this.getLiteralType(expression.value)

      case 'IdentifierExpression':
        return this.resolveVariable(expression.name.lexeme)?.type ?? 'unknown'

      case 'GroupingExpression':
        return this.getKnownExpressionType(expression.expression)

      case 'UnaryExpression':
        return expression.operator.kind === 'Minus'
          ? 'number'
          : 'boolean'

      case 'CallExpression':
        return this.functions.get(expression.callee.lexeme)?.returnType ?? 'unknown'

      case 'BinaryExpression': {
        const operator = expression.operator.kind

        if (
          operator === 'AndAnd' ||
          operator === 'OrOr' ||
          operator === 'Greater' ||
          operator === 'GreaterEqual' ||
          operator === 'Less' ||
          operator === 'LessEqual' ||
          operator === 'EqualEqual' ||
          operator === 'BangEqual'
        ) {
          return 'boolean'
        }

        if (operator === 'Plus') {
          const leftType = this.getKnownExpressionType(expression.left)
          const rightType = this.getKnownExpressionType(expression.right)

          if (leftType === 'string' || rightType === 'string') {
            return 'string'
          }

          if (leftType === 'number' && rightType === 'number') {
            return 'number'
          }

          return 'unknown'
        }

        if (
          operator === 'Minus' ||
          operator === 'Star' ||
          operator === 'Slash' ||
          operator === 'Percent'
        ) {
          return 'number'
        }

        return 'unknown'
      }
    }
  }


  private constrainExpressionType(
    expression: Expression,
    expectedType: ValueType,
  ): void {
    if (expectedType === 'unknown') return

    if (expression.kind === 'IdentifierExpression') {
      const variable = this.resolveVariable(
        expression.name.lexeme,
      )

      if (
        variable &&
        variable.isParameter &&
        variable.type === 'unknown'
      ) {
        variable.type = expectedType
      }

      return
    }

    if (expression.kind === 'GroupingExpression') {
      this.constrainExpressionType(
        expression.expression,
        expectedType,
      )
    }
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

    if (statement.kind === 'ReturnStatement') {
      if (this.functionDepth === 0) {
        this.addError(
          'Cannot return from outside a function.',
          statement.keyword,
        )
      }

      let returnType: ValueType = 'void'

      if (statement.value !== null) {
        returnType = this.inferExpressionType(statement.value)
      }

      const currentReturnTypes =
        this.functionReturnTypes[
        this.functionReturnTypes.length - 1
        ]

      if (this.functionDepth > 0 && currentReturnTypes) {
        currentReturnTypes.push(returnType)
      }

      return
    }

    if (statement.kind === 'IfStatement') {
      this.constrainExpressionType(
        statement.condition,
        'boolean',
      )

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

      return
    }

    if (statement.kind === 'WhileStatement') {
      this.constrainExpressionType(
        statement.condition,
        'boolean',
      )

      const conditionType = this.inferExpressionType(
        statement.condition,
      )

      if (
        conditionType !== 'boolean' &&
        conditionType !== 'unknown'
      ) {
        this.addError(
          'While condition must be a boolean.',
          this.getExpressionToken(statement.condition),
        )
      }

      this.beginScope()

      for (const child of statement.body) {
        this.analyzeStatement(child)
      }

      this.endScope()
      return
    }

    if (statement.kind === 'FunctionDeclaration') {
      const functionName = statement.name.lexeme

      if (this.functions.has(functionName)) {
        this.addError(
          `Function '${functionName}' is already declared.`,
          statement.name,
        )
        return
      }

      const functionInfo: FunctionInfo = {
        token: statement.name,
        parameterCount: statement.parameters.length,
        parameterTypes: statement.parameters.map(() => 'unknown'),
        returnType: 'unknown',
      }

      this.functions.set(functionName, functionInfo)

      this.beginScope()

      const parameterVariables: VariableInfo[] = []

      for (const parameter of statement.parameters) {
        const variable = this.declareVariable(
          parameter.lexeme,
          parameter,
          'unknown',
          true,
        )

        if (variable) {
          parameterVariables.push(variable)
        }
      }

      this.functionDepth += 1
      this.functionReturnTypes.push([])

      for (const child of statement.body) {
        this.analyzeStatement(child)
      }

      const returnTypes =
        this.functionReturnTypes.pop() ?? []

      this.functionDepth -= 1

      functionInfo.parameterTypes = parameterVariables.map(
        parameter => parameter.type,
      )

      functionInfo.returnType = this.inferFunctionReturnType(
        returnTypes,
        statement.name,
      )

      this.endScope()
      return
    }
  }

  private inferFunctionReturnType(
    returnTypes: ValueType[],
    functionToken: Token,
  ): ValueType {
    if (returnTypes.length === 0) {
      return 'void'
    }

    const concreteTypes = returnTypes.filter(
      type => type !== 'unknown',
    )

    const distinctTypes = [...new Set(concreteTypes)]

    if (distinctTypes.length > 1) {
      this.addError(
        `Function '${functionToken.lexeme}' has inconsistent return types: ${distinctTypes.join(' and ')}.`,
        functionToken,
      )

      return 'unknown'
    }

    if (returnTypes.includes('unknown')) {
      return 'unknown'
    }

    return distinctTypes[0] ?? 'void'
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
        const expectedType =
          expression.operator.kind === 'Minus'
            ? 'number'
            : 'boolean'

        this.constrainExpressionType(
          expression.right,
          expectedType,
        )

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

      case 'CallExpression': {
        const argumentTypes = expression.arguments.map(
          argument => this.inferExpressionType(argument),
        )

        const functionInfo = this.functions.get(
          expression.callee.lexeme,
        )

        if (!functionInfo) {
          this.addError(
            `Function '${expression.callee.lexeme}' is not declared.`,
            expression.callee,
          )
          return 'unknown'
        }

        if (
          expression.arguments.length !==
          functionInfo.parameterCount
        ) {
          this.addError(
            `Function '${expression.callee.lexeme}' expects ${functionInfo.parameterCount} argument(s), but got ${expression.arguments.length}.`,
            expression.callee,
          )
        }

        const count = Math.min(
          argumentTypes.length,
          functionInfo.parameterTypes.length,
        )

        for (let i = 0; i < count; i++) {
          const expectedType = functionInfo.parameterTypes[i]
          const actualType = argumentTypes[i]

          if (
            expectedType &&
            actualType &&
            expectedType !== 'unknown' &&
            actualType !== 'unknown' &&
            expectedType !== actualType
          ) {
            this.addError(
              `Argument ${i + 1} of function '${expression.callee.lexeme}' must be ${expectedType}, but got ${actualType}.`,
              this.getExpressionToken(expression.arguments[i]!),
            )
          }
        }

        return functionInfo.returnType
      }

      case 'BinaryExpression': {
        const operator = expression.operator

        if (
          operator.kind === 'AndAnd' ||
          operator.kind === 'OrOr'
        ) {
          this.constrainExpressionType(expression.left, 'boolean')
          this.constrainExpressionType(expression.right, 'boolean')
        } else if (
          operator.kind === 'Minus' ||
          operator.kind === 'Star' ||
          operator.kind === 'Slash' ||
          operator.kind === 'Percent' ||
          operator.kind === 'Greater' ||
          operator.kind === 'GreaterEqual' ||
          operator.kind === 'Less' ||
          operator.kind === 'LessEqual'
        ) {
          this.constrainExpressionType(expression.left, 'number')
          this.constrainExpressionType(expression.right, 'number')
        } else if (operator.kind === 'Plus') {
          const initialLeft = this.getKnownExpressionType(expression.left)
          const initialRight = this.getKnownExpressionType(expression.right)

          if (initialLeft === 'string' || initialRight === 'string') {
            this.constrainExpressionType(expression.left, 'string')
            this.constrainExpressionType(expression.right, 'string')
          } else {
            this.constrainExpressionType(expression.left, 'number')
            this.constrainExpressionType(expression.right, 'number')
          }
        } else if (
          operator.kind === 'EqualEqual' ||
          operator.kind === 'BangEqual'
        ) {
          const initialLeft = this.getKnownExpressionType(expression.left)
          const initialRight = this.getKnownExpressionType(expression.right)

          if (initialLeft !== 'unknown') {
            this.constrainExpressionType(expression.right, initialLeft)
          } else if (initialRight !== 'unknown') {
            this.constrainExpressionType(expression.left, initialRight)
          }
        }

        const leftType = this.inferExpressionType(expression.left)
        const rightType = this.inferExpressionType(expression.right)

        if (
          operator.kind === 'AndAnd' ||
          operator.kind === 'OrOr'
        ) {
          if (leftType !== 'boolean' && leftType !== 'unknown') {
            this.addError(
              `Left operand of '${operator.lexeme}' must be boolean.`,
              operator,
            )
          }

          if (rightType !== 'boolean' && rightType !== 'unknown') {
            this.addError(
              `Right operand of '${operator.lexeme}' must be boolean.`,
              operator,
            )
          }

          return 'boolean'
        }

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

      case 'CallExpression':
        return expression.callee
    }
  }

  private getLiteralType(
    value: string | number | boolean | null,
  ): ValueType {
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