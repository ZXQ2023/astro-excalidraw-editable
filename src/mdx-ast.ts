interface EstreeIdentifier {
  type: 'Identifier'
  name: string
}

interface EstreeImportDeclaration {
  type: 'ImportDeclaration'
  specifiers: Array<{
    type: 'ImportDefaultSpecifier'
    local: EstreeIdentifier
  }>
  source: {
    type: 'Literal'
    value: string
    raw: string
  }
}

interface EstreeProgram {
  type: 'Program'
  sourceType: 'module'
  body: unknown[]
}

function identifier(name: string): EstreeIdentifier {
  return { type: 'Identifier', name }
}

function program(body: unknown[]): EstreeProgram {
  return { type: 'Program', sourceType: 'module', body }
}

export function createMdxEsmImport(name: string, source: string) {
  const declaration: EstreeImportDeclaration = {
    type: 'ImportDeclaration',
    specifiers: [{
      type: 'ImportDefaultSpecifier',
      local: identifier(name),
    }],
    source: {
      type: 'Literal',
      value: source,
      raw: JSON.stringify(source),
    },
  }

  return {
    type: 'mdxjsEsm',
    value: `import ${name} from ${JSON.stringify(source)}`,
    data: {
      estree: program([declaration]),
    },
  }
}

export function createMdxExpressionAttribute(name: string, expression: string) {
  return {
    type: 'mdxJsxAttribute',
    name,
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: expression,
      data: {
        estree: program([{
          type: 'ExpressionStatement',
          expression: identifier(expression),
        }]),
      },
    },
  }
}

export function createMdxStringAttribute(name: string, value: string) {
  return {
    type: 'mdxJsxAttribute',
    name,
    value,
  }
}
