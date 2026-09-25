import { Link, useLocation } from '@tanstack/react-router'
import { LogOut, Moon, Search, Settings, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme.js'
import { useAppearance } from '../lib/appearance.js'
import { orderedNav } from '../lib/nav.js'
import { logout } from '../lib/auth.js'
import { appVersion } from '../version.js'

export const navButtonClass = [
  'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
  'text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900',
  'dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
].join(' ')

export function Sidebar({
  user,
  onHide,
}: {
  user:   { displayName: string; email: string } | null
  onHide: () => void
}) {
  const { theme, toggleTheme } = useTheme()
  const { nav } = useAppearance()
  const { pathname } = useLocation()
  const items = orderedNav(nav)

  const initials = user?.displayName
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <aside className="flex flex-col items-center gap-1 h-screen py-3 w-14 shrink-0 border-r border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <button
        type="button"
        title="Hide sidebar"
        aria-label="Hide sidebar"
        onClick={onHide}
        className="mb-1 flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white font-bold text-sm select-none"
      >
        TW
      </button>
      <div className="mb-2 text-[10px] font-medium leading-none text-zinc-400 dark:text-zinc-500" title={`Version ${appVersion}`}>
        {appVersion}
      </div>

      <NavBtn icon={<Search size={18} />} label="Search" onClick={() => {}} />

      <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

      {items.map(item => {
        const active = pathname.startsWith(item.to)
        const Icon = item.icon
        return (
          <Link
            key={item.id}
            to={item.to}
            title={item.label}
            className={[
              'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
              active
                ? 'bg-indigo-600 text-white'
                : 'hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
            ].join(' ')}
          >
            <Icon size={20} />
          </Link>
        )
      })}

      <div className="flex-1" />

      <Link
        to="/settings"
        title="Settings"
        aria-label="Settings"
        className={[
          'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
          pathname.startsWith('/settings')
            ? 'bg-indigo-600 text-white'
            : 'hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
        ].join(' ')}
      >
        <Settings size={18} />
      </Link>

      <NavBtn
        icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        onClick={toggleTheme}
      />

      <div
        className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-200 text-zinc-700 text-xs font-semibold select-none cursor-default dark:bg-zinc-700 dark:text-zinc-100"
        title={user?.email ?? 'No user'}
      >
        {initials}
      </div>

      <NavBtn
        icon={<LogOut size={18} />}
        label="Sign out"
        onClick={async () => {
          await logout()
          window.location.href = '/auth/login'
        }}
      />
    </aside>
  )
}

function NavBtn({
  icon, label, onClick,
}: {
  icon:    React.ReactNode
  label:   string
  onClick: () => void
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={navButtonClass}
    >
      {icon}
    </button>
  )
}
