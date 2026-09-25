export function normalizeNav(saved: string[] | null, defaults: readonly string[]): string[] {
  const known = new Set(defaults)
  const seen = new Set<string>()
  const next: string[] = []
  for (const id of saved ?? []) {
    if (!known.has(id) || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  for (const id of defaults) {
    if (!seen.has(id)) next.push(id)
  }
  return next
}

export function moveNav(order: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return [...order]
  const next = [...order]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

export function readNavOrder(defaults: readonly string[]): string[] {
  try {
    const raw = localStorage.getItem('twork.nav')
    const parsed = raw ? JSON.parse(raw) as unknown : null
    return normalizeNav(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : null, defaults)
  } catch {
    return [...defaults]
  }
}
