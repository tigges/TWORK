import React, { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bot, Plus, ChevronRight } from 'lucide-react'
import { Button, Card } from '@ybot/ui'
import { useAppStore } from '../store/app'
import { apiFetch } from '../lib/api'
import type { Bot as BotType } from '../store/app'

export function BotSelectorPage() {
  const navigate = useNavigate()
  const { bots, setBots, selectBot, user } = useAppStore()
  const [loading, setLoading] = useState(bots.length === 0)

  useEffect(() => {
    if (bots.length === 0) {
      apiFetch<{ data: BotType[] }>('/bots')
        .then((r) => { setBots(r.data); setLoading(false) })
        .catch(() => setLoading(false))
    }
  }, [])

  function handleSelect(botId: string) {
    selectBot(botId)
    navigate({ to: '/overview' })
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-[560px]">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {user?.displayName ? `Welcome back, ${user.displayName}` : 'Choose a bot'}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Select a bot to continue</p>
        </div>

        {loading ? (
          <div className="text-center text-sm text-[var(--text-muted)]">Loading…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => handleSelect(bot.id)}
                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 text-left hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-muted)] text-[var(--accent)] text-lg font-bold">
                  {bot.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[var(--text-primary)]">{bot.name}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {bot.environments.length} environment{bot.environments.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </button>
            ))}

            <button
              onClick={() => navigate({ to: '/bots/new' })}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-dashed border-[var(--border)] bg-transparent p-4 text-left hover:border-[var(--accent)]/40 hover:bg-[var(--accent-muted)] transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--bg-overlay)]">
                <Plus size={18} className="text-[var(--text-muted)]" />
              </div>
              <p className="font-medium text-[var(--text-muted)]">Create new bot</p>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
