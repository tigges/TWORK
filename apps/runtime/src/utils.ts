// Lightweight variable interpolation: "Hello {{contact.name}}" → "Hello Alice"
export function interpolate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, path: string) => {
    const keys = path.trim().split('.')
    let val: unknown = variables
    for (const k of keys) {
      if (val && typeof val === 'object') {
        val = (val as Record<string, unknown>)[k]
      } else {
        return `{{${path}}}`
      }
    }
    return val !== undefined && val !== null ? String(val) : `{{${path}}}`
  })
}

// Resolve a condition: { field, operator, value }
type Operator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_set' | 'is_empty'
export function evaluateCondition(
  field: string,
  operator: Operator,
  expected: string,
  variables: Record<string, unknown>,
): boolean {
  const actual = String(variables[field] ?? '')
  switch (operator) {
    case 'equals':       return actual === expected
    case 'not_equals':   return actual !== expected
    case 'contains':     return actual.toLowerCase().includes(expected.toLowerCase())
    case 'greater_than': return parseFloat(actual) > parseFloat(expected)
    case 'less_than':    return parseFloat(actual) < parseFloat(expected)
    case 'is_set':       return actual !== '' && actual !== 'undefined' && actual !== 'null'
    case 'is_empty':     return actual === '' || actual === 'undefined' || actual === 'null'
    default:             return false
  }
}
