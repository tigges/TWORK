import { Link, useLocation } from '@tanstack/react-router'
import {
  Calendar,
  FileText,
  Folder,
  LogOut,
  Mail,
  MessageSquare,
  Users,
  Moon,
  Search,
  Sun,
} from 'lucide-react'
import { useTheme } from '../lib/theme.js'
import { logout } from '../lib/auth.js'
import { appVersion } from '../version.js'

interface NavItem {
  to:    string
  icon:  React.ReactNode
  label: string
}

const NAV: NavItem[] = [
  { to: '/mail',     icon: <Mail size={20} />,          label: 'Mail'     },
  { to: '/contacts', icon: <Users size={20} />,          label: 'Contacts' },
  { to: '/files',    icon: <Folder size={20} />,         label: 'Files'    },
  { to: '/pages',    icon: <FileText size={20} />,       label: 'Pages'    },
  { to: '/calendar', icon: <Calendar size={20} />,       label: 'Calendar' },
  { to: '/rooms',    icon: <MessageSquare size={20} />,  label: 'Rooms'    },
]

export function Sidebar({ user }: { user: { displayName: string; email: string } | null }) {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()

  const initials = user?.displayName
    .split(' ')
    .map(s => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?'

  return (
    <aside className="flex flex-col items-center gap-1 h-screen py-3 bg-zinc-950 dark:bg-zinc-950 text-zinc-400 w-14 shrink-0">
      {/* Logo */}
      <div className="mb-1 flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 text-white font-bold text-sm select-none">
        TW
      </div>
      <div className="mb-2 text-[10px] font-medium leading-none text-zinc-500" title={`Version ${appVersion}`}>
        {appVersion}
      </div>

      {/* Search shortcut */}
      <NavBtn icon={<Search size={18} />} label="Search" onClick={() => {}} />

      <div className="w-8 h-px bg-zinc-800 my-1" />

      {/* Module nav */}
      {NAV.map(item => {
        const active = pathname.startsWith(item.to)
        return (
          <Link
            key={item.to}
            to={item.to}
            title={item.label}
            className={[
              'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
              active
                ? 'bg-indigo-600 text-white'
                : 'hover:bg-zinc-800 hover:text-zinc-100',
            ].join(' ')}
          >
            {item.icon}
          </Link>
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme toggle */}
      <NavBtn
        icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        onClick={toggleTheme}
      />

      {/* User avatar */}
      <div
        className="flex items-center justify-center w-9 h-9 rounded-full bg-zinc-700 text-zinc-100 text-xs font-semibold select-none cursor-default"
        title={user?.email ?? 'No user'}
      >
        {initials}
      </div>

      {/* Logout */}
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
      className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-zinc-800 hover:text-zinc-100 transition-colors"
    >
      {icon}
    </button>
  )
}
