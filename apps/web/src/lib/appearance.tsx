import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { accentById, applyAccent, readAccentId, type Accent } from './accent.js'
import { moveNav, readNavOrder } from './nav-order.js'
import { NAV_IDS } from './nav.js'

interface Appearance {
  accent:  Accent
  nav:     string[]
  setAccent: (id: string) => void
  setNav:    (order: string[]) => void
  stepNav:   (index: number, direction: -1 | 1) => void
}

const Ctx = createContext<Appearance | null>(null)

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [accentId, setAccentId] = useState(readAccentId)
  const [nav, setNavState] = useState(() => readNavOrder(NAV_IDS))

  useEffect(() => { applyAccent(accentId) }, [accentId])

  useEffect(() => {
    localStorage.setItem('twork.nav', JSON.stringify(nav))
  }, [nav])

  const setAccent = useCallback((id: string) => { setAccentId(accentById(id).id) }, [])
  const setNav = useCallback((order: string[]) => { setNavState(order) }, [])
  const stepNav = useCallback((index: number, direction: -1 | 1) => {
    setNavState(order => moveNav(order, index, index + direction))
  }, [])

  const value = useMemo<Appearance>(() => ({
    accent: accentById(accentId),
    nav,
    setAccent,
    setNav,
    stepNav,
  }), [accentId, nav, setAccent, setNav, stepNav])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAppearance(): Appearance {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider')
  return ctx
}
