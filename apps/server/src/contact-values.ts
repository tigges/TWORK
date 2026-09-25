export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const plus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return ''
  return plus ? `+${digits}` : digits
}

export function uniqueEmails(values: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const email = normalizeEmail(value)
    if (!email || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

export function uniquePhones(values: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    const phone = normalizePhone(value)
    if (!phone || seen.has(phone)) continue
    seen.add(phone)
    out.push(phone)
  }
  return out
}
