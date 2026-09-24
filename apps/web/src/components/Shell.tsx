import { Sidebar } from './Sidebar.js'

interface ShellProps {
  user:     { displayName: string; email: string } | null
  children: React.ReactNode
}

export function Shell({ user, children }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <Sidebar user={user} />
      <main className="flex flex-1 flex-col overflow-hidden min-w-0 min-h-0">
        {children}
      </main>
    </div>
  )
}
