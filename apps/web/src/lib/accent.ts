export interface Accent {
  id:   string
  code: string
  scale: Record<'50' | '100' | '200' | '400' | '500' | '600' | '700' | '900' | '950', string>
}

// Solid button colors are dark enough for white text. Lighter hues use the
// darker step of that family as the 600 slot.
export const ACCENTS: readonly Accent[] = [
  { id: 'red', code: '#dc2626', scale: { 50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca', 400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c', 900: '#7f1d1d', 950: '#450a0a' } },
  { id: 'orange', code: '#c2410c', scale: { 50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 400: '#f97316', 500: '#ea580c', 600: '#c2410c', 700: '#9a3412', 900: '#7c2d12', 950: '#431407' } },
  { id: 'amber', code: '#b45309', scale: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 400: '#f59e0b', 500: '#d97706', 600: '#b45309', 700: '#92400e', 900: '#78350f', 950: '#451a03' } },
  { id: 'green', code: '#15803d', scale: { 50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 400: '#22c55e', 500: '#16a34a', 600: '#15803d', 700: '#166534', 900: '#14532d', 950: '#052e16' } },
  { id: 'teal', code: '#0f766e', scale: { 50: '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4', 400: '#14b8a6', 500: '#0d9488', 600: '#0f766e', 700: '#115e59', 900: '#134e4a', 950: '#042f2e' } },
  { id: 'sky', code: '#0369a1', scale: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 400: '#0ea5e9', 500: '#0284c7', 600: '#0369a1', 700: '#075985', 900: '#0c4a6e', 950: '#082f49' } },
  { id: 'blue', code: '#2563eb', scale: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a', 950: '#172554' } },
  { id: 'indigo', code: '#4f46e5', scale: { 50: '#eef2ff', 100: '#e0e7ff', 200: '#c7d2fe', 400: '#818cf8', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81', 950: '#1e1b4b' } },
  { id: 'violet', code: '#7c3aed', scale: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 900: '#4c1d95', 950: '#2e1065' } },
  { id: 'purple', code: '#9333ea', scale: { 50: '#faf5ff', 100: '#f3e8ff', 200: '#e9d5ff', 400: '#c084fc', 500: '#a855f7', 600: '#9333ea', 700: '#7e22ce', 900: '#581c87', 950: '#3b0764' } },
  { id: 'pink', code: '#db2777', scale: { 50: '#fdf2f8', 100: '#fce7f3', 200: '#fbcfe8', 400: '#f472b6', 500: '#ec4899', 600: '#db2777', 700: '#be185d', 900: '#9d174d', 950: '#500724' } },
  { id: 'rose', code: '#e11d48', scale: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337', 950: '#4c0519' } },
]

export const DEFAULT_ACCENT = 'indigo'
const ACCENT_KEY = 'twork.accent'
const ACCENT_VARS_KEY = 'twork.accent.vars'

export function accentById(id: string | null | undefined): Accent {
  return ACCENTS.find(item => item.id === id) ?? ACCENTS.find(item => item.id === DEFAULT_ACCENT)!
}

export function readAccentId(): string {
  try {
    return accentById(localStorage.getItem(ACCENT_KEY)).id
  } catch {
    return DEFAULT_ACCENT
  }
}

export function applyAccent(id: string): Accent {
  const accent = accentById(id)
  const root = document.documentElement
  const vars: Record<string, string> = {}
  for (const [step, value] of Object.entries(accent.scale)) {
    const key = `--color-indigo-${step}`
    root.style.setProperty(key, value)
    vars[key] = value
  }
  try {
    localStorage.setItem(ACCENT_KEY, accent.id)
    localStorage.setItem(ACCENT_VARS_KEY, JSON.stringify(vars))
  } catch {
    // Private mode can reject storage. The color still applies for this visit.
  }
  return accent
}

export function applyStoredAccent(): Accent {
  return applyAccent(readAccentId())
}
