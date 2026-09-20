import React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ChevronDown,
  Plus,
  Sun,
  Moon,
  LogOut,
  User,
  Settings,
  Beaker,
  Rocket,
} from 'lucide-react'
import {
  Avatar,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Button,
} from '@ybot/ui'
import { useAppStore } from '../store/app'
import { apiFetch } from '../lib/api'

interface TopBarProps {
  darkMode: boolean
  onToggleDark: () => void
}

export function TopBar({ darkMode, onToggleDark }: TopBarProps) {
  const navigate = useNavigate()
  const { user, bots, selectedBotId, selectedEnv, selectBot, setEnv, clearAuth } = useAppStore()

  const selectedBot = bots.find((b) => b.id === selectedBotId)

  async function handleLogout() {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => null)
    clearAuth()
    navigate({ to: '/sign-in' })
  }

  return (
    <header
      className="flex h-[var(--topbar-height)] items-center justify-between gap-4 border-b border-[var(--topbar-border)] bg-[var(--topbar-bg)] px-4 shrink-0"
    >
      {/* Left: Bot switcher */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-[var(--radius)] px-2 py-1 text-sm hover:bg-[var(--bg-hover)] transition-colors">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-bold">
                {selectedBot?.name?.[0] ?? 'B'}
              </div>
              <span className="font-medium text-[var(--text-primary)] max-w-[140px] truncate">
                {selectedBot?.name ?? 'Select Bot'}
              </span>
              <ChevronDown size={13} className="text-[var(--text-muted)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Switch Bot</DropdownMenuLabel>
            {bots.map((bot) => (
              <DropdownMenuItem
                key={bot.id}
                onClick={() => selectBot(bot.id)}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded bg-[var(--accent-muted)] text-[var(--accent)] text-[10px] font-bold">
                  {bot.name[0]}
                </div>
                <span>{bot.name}</span>
                {bot.id === selectedBotId && (
                  <span className="ml-auto text-[var(--accent)] text-xs">✓</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: '/bots/new' })}>
              <Plus size={14} />
              New Bot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Env switcher */}
        <div className="flex items-center gap-1 rounded-[var(--radius)] bg-[var(--bg-overlay)] p-0.5 border border-[var(--border)]">
          <button
            onClick={() => setEnv('sandbox')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedEnv === 'sandbox'
                ? 'bg-[var(--warning-muted)] text-[var(--warning)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Beaker size={12} />
            Sandbox
          </button>
          <button
            onClick={() => setEnv('production')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              selectedEnv === 'production'
                ? 'bg-[var(--success-muted)] text-[var(--success)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Rocket size={12} />
            Production
          </button>
        </div>
      </div>

      {/* Right: theme + user */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleDark}
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-[var(--radius)] px-2 py-1 hover:bg-[var(--bg-hover)] transition-colors">
              <Avatar name={user?.displayName} src={user?.avatarUrl ?? null} size="sm" />
              <span className="text-sm text-[var(--text-secondary)] hidden md:block">
                {user?.displayName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: '/settings' })}>
              <Settings size={14} /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={handleLogout}>
              <LogOut size={14} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
