import React, { useState } from 'react'
import { Card, Button, Input, Badge, Avatar } from '@ybot/ui'
import { useAppStore } from '../store/app'
import { useSystemConfig, useSystemStatus } from '../lib/hooks'
import type { ConfigEntry } from '../lib/api'
import {
  CheckCircle2, XCircle, Key, Database, Radio,
  HardDrive, Cpu, Globe, Settings2, User, Lock,
  RefreshCw, ChevronRight, Copy, ExternalLink,
  Bot, Zap,
} from 'lucide-react'
import { cn } from '@ybot/ui'

// ── helpers ───────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  void navigator.clipboard?.writeText(text)
}

// ── sub-components ────────────────────────────────────────────────────────────

function SecretRow({ entry, envKey }: { entry: ConfigEntry; envKey: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopyKey() {
    copyToClipboard(envKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-[var(--bg-hover)] transition-colors border-b border-[var(--border)] last:border-0">
      <div className={cn('flex h-7 w-7 items-center justify-center rounded-full shrink-0',
        entry.set ? 'bg-[var(--success)]/15' : 'bg-[var(--danger)]/10',
      )}>
        {entry.set
          ? <CheckCircle2 size={14} className="text-[var(--success)]" />
          : <XCircle size={14} className="text-[var(--danger)]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono font-medium text-[var(--text-primary)] truncate">{envKey}</p>
        <p className="text-[11px] text-[var(--text-muted)]">{entry.label}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {(entry.value ?? entry.endpoint) && (
          <span className="text-[11px] font-mono text-[var(--text-secondary)] max-w-[160px] truncate">
            {entry.value ?? entry.endpoint}
          </span>
        )}
        <Badge variant={entry.set ? 'success' : 'error'} className="shrink-0">
          {entry.set ? 'Set' : 'Missing'}
        </Badge>
        <button
          onClick={handleCopyKey}
          title="Copy env key name"
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
        >
          {copied ? <CheckCircle2 size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
        <Icon size={13} className="text-[var(--accent)]" />
        <span className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wide">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Secrets tab ───────────────────────────────────────────────────────────────

function SecretsTab() {
  const { data: cfg, isLoading, isFetching, refetch } = useSystemConfig()
  const { data: status } = useSystemStatus()

  const allEntries = cfg ? [
    ...Object.entries(cfg.auth).map(([k, v]) => ({ group: 'auth', key: k, entry: v as ConfigEntry })),
    ...Object.entries(cfg.database).map(([k, v]) => ({ group: 'database', key: k, entry: v as ConfigEntry })),
    ...Object.entries(cfg.cache).map(([k, v]) => ({ group: 'cache', key: k, entry: v as ConfigEntry })),
    ...Object.entries(cfg.storage).map(([k, v]) => ({ group: 'storage', key: k, entry: v as ConfigEntry })),
    ...Object.entries(cfg.llm).map(([k, v]) => ({ group: 'llm', key: k, entry: v as ConfigEntry })),
    ...Object.entries(cfg.app).map(([k, v]) => ({ group: 'app', key: k, entry: v as ConfigEntry })),
  ] : []

  const missingCount = allEntries.filter((e) => !e.entry.set).length
  const setCount = allEntries.filter((e) => e.entry.set).length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--success)]/10 border border-[var(--success)]/20">
          <CheckCircle2 size={13} className="text-[var(--success)]" />
          <span className="text-xs font-medium text-[var(--text-primary)]">{setCount} configured</span>
        </div>
        {missingCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--danger)]/10 border border-[var(--danger)]/20">
            <XCircle size={13} className="text-[var(--danger)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">{missingCount} missing</span>
          </div>
        )}
        <button
          onClick={() => void refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors ml-auto"
        >
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={18} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : cfg ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Auth */}
          <SectionCard title="Authentication" icon={Key}>
            {Object.entries(cfg.auth).map(([k, v]) => <SecretRow key={k} envKey={k} entry={v as ConfigEntry} />)}
          </SectionCard>

          {/* Database */}
          <SectionCard title="Database" icon={Database}>
            {Object.entries(cfg.database).map(([k, v]) => <SecretRow key={k} envKey={k} entry={v as ConfigEntry} />)}
            {status?.services.database && (
              <div className={cn('flex items-center gap-2 px-4 py-2.5 text-xs border-t border-[var(--border)]',
                status.services.database.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]',
              )}>
                {status.services.database.ok
                  ? <><CheckCircle2 size={12} /> Connected · {status.services.database.latencyMs}ms</>
                  : <><XCircle size={12} /> Not reachable</>}
              </div>
            )}
          </SectionCard>

          {/* Cache */}
          <SectionCard title="Cache (Redis / Valkey)" icon={Radio}>
            {Object.entries(cfg.cache).map(([k, v]) => <SecretRow key={k} envKey={k} entry={v as ConfigEntry} />)}
            {status?.services.redis && (
              <div className={cn('flex items-center gap-2 px-4 py-2.5 text-xs border-t border-[var(--border)]',
                status.services.redis.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]',
              )}>
                {status.services.redis.ok
                  ? <><CheckCircle2 size={12} /> Connected · {status.services.redis.latencyMs}ms</>
                  : <><XCircle size={12} /> Not reachable</>}
              </div>
            )}
          </SectionCard>

          {/* Storage */}
          <SectionCard title="Object Storage (S3 / MinIO)" icon={HardDrive}>
            {Object.entries(cfg.storage).map(([k, v]) => <SecretRow key={k} envKey={k} entry={v as ConfigEntry} />)}
          </SectionCard>

          {/* LLM */}
          <SectionCard title="LLM / AI Keys" icon={Zap}>
            {Object.entries(cfg.llm).map(([k, v]) => <SecretRow key={k} envKey={k} entry={v as ConfigEntry} />)}
            <div className="px-4 py-2.5 border-t border-[var(--border)]">
              <p className="text-[11px] text-[var(--text-muted)]">
                At least one LLM key is required for AI features.
                Set in <code className="font-mono bg-[var(--bg-overlay)] px-1 rounded">.env.production</code> on AVIORI.
              </p>
            </div>
          </SectionCard>

          {/* App */}
          <SectionCard title="Application" icon={Globe}>
            {Object.entries(cfg.app).map(([k, v]) => <SecretRow key={k} envKey={k} entry={v as ConfigEntry} />)}
          </SectionCard>
        </div>
      ) : null}

      {/* How-to card */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-overlay)] p-4 space-y-2">
        <p className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <Settings2 size={13} className="text-[var(--accent)]" />
          How to update a secret on AVIORI
        </p>
        <ol className="space-y-1.5 text-xs text-[var(--text-secondary)] list-decimal list-inside">
          <li>SSH into AVIORI: <code className="font-mono bg-[var(--bg-surface)] px-1 rounded">ssh ct@192.168.0.11</code></li>
          <li>Edit the env file: <code className="font-mono bg-[var(--bg-surface)] px-1 rounded">nano /volume1/docker/ybot/.env.production</code></li>
          <li>Restart the API: <code className="font-mono bg-[var(--bg-surface)] px-1 rounded">docker compose -f docker-compose.yml up -d api</code></li>
        </ol>
        <div className="pt-1 flex gap-2">
          <button
            onClick={() => copyToClipboard('docker compose -f docker-compose.yml pull && docker compose -f docker-compose.yml up -d')}
            className="flex items-center gap-1.5 text-[11px] text-[var(--accent)] hover:underline"
          >
            <Copy size={11} /> Copy full restart command
          </button>
          <span className="text-[var(--border)]">·</span>
          <a
            href="/admin/system-status"
            className="flex items-center gap-1 text-[11px] text-[var(--accent)] hover:underline"
          >
            System Status <ChevronRight size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'password' | 'secrets'

export function SettingsPage() {
  const { user } = useAppStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'secrets', label: 'Secrets & Connections', icon: Key },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header + tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)] mb-3">Settings</h1>
        <div className="flex gap-0">
          {TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                  tab === t.id
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                )}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {tab === 'profile' && (
          <div className="max-w-lg space-y-6">
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Profile</h3>
              <div className="flex items-center gap-4 mb-4">
                <Avatar name={user?.displayName} size="lg" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{user?.displayName}</p>
                  <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
                  <Badge variant="muted" className="mt-1">{user?.role}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                <Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                <Input label="Email" value={user?.email ?? ''} disabled />
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="md" onClick={handleSave}>{saved ? 'Saved!' : 'Save changes'}</Button>
              </div>
            </Card>
          </div>
        )}

        {tab === 'password' && (
          <div className="max-w-lg">
            <Card>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Change Password</h3>
              <div className="space-y-3">
                <Input label="Current password" type="password" placeholder="••••••••" />
                <Input label="New password" type="password" placeholder="••••••••" />
                <Input label="Confirm new password" type="password" placeholder="••••••••" />
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="md" variant="secondary">Update password</Button>
              </div>
            </Card>
          </div>
        )}

        {tab === 'secrets' && <SecretsTab />}
      </div>
    </div>
  )
}
