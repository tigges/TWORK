import { createContext, useContext, useEffect, useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar, navButtonClass } from './Sidebar.js'

interface ShellProps {
  user:     { displayName: string; email: string } | null
  children: React.ReactNode
}

const SidebarOpenContext = createContext(true)
const STORAGE_KEY = 'twork-sidebar'

export function useSidebarOpen(): boolean {
  return useContext(SidebarOpenContext)
}

export function Shell({ user, children }: ShellProps) {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) !== 'closed')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, open ? 'open' : 'closed')
  }, [open])

  return (
    <SidebarOpenContext.Provider value={open}>
      <div className="relative flex h-screen overflow-hidden bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        {open ? (
          <Sidebar user={user} onHide={() => setOpen(false)} />
        ) : (
          <button
            type="button"
            title="Show sidebar"
            aria-label="Show sidebar"
            onClick={() => setOpen(true)}
            className={`absolute left-2 top-1.5 z-30 ${navButtonClass}`}
          >
            <Menu size={18} />
          </button>
        )}
        <main className="flex flex-1 flex-col overflow-hidden min-w-0 min-h-0">
          {children}
        </main>
      </div>
    </SidebarOpenContext.Provider>
  )
}
