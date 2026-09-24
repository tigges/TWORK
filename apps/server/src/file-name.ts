/** A single path segment. Slashes are rejected so a name cannot invent a folder. */
export function cleanFileName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name || name === '.' || name === '..') return null
  if (/[\\/]/.test(name)) return null
  if (name.length > 180) return null
  return name
}
