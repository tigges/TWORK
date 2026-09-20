import React, { useState } from 'react'
import {
  Search, Filter, ChevronDown, ChevronRight,
  LogIn, Bot, FileText, Users, Settings, Globe,
  CheckCircle2, AlertCircle, Info, Pencil, Trash2,
  Shield, UserPlus, Send, RefreshCw, Key,
} from 'lucide-react'
import { Avatar, Badge, Button, Input } from '@ybot/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'
import { useAuditLog } from '../../lib/hooks'

const SUBNAV = [
  { label: 'Team', path: '/admin/team' },
  { label: 'Audit Log', path: '/admin/audit' },
]

type AuditAction =
  | 'user.login' | 'user.logout' | 'user.invited' | 'user.role_changed'
  | 'bot.published' | 'bot.created'
  | 'flow.updated' | 'flow.published'
  | 'template.submitted' | 'template.approved'
  | 'channel.connected' | 'channel.disconnected'
  | 'webhook.created' | 'webhook.deleted'
  | 'settings.updated' | 'api_key.created' | 'api_key.revoked'
  | 'knowledge.synced' | 'contact.deleted'

type AuditSeverity = 'info' | 'warning' | 'success' | 'error'

interface AuditEvent {
  id: string
  actor: { name: string; email: string }
  action: AuditAction
  resource: string
  details: string
  ip: string
  timestamp: string
  severity: AuditSeverity
}

const ACTION_CFG: Record<AuditAction, { icon: React.ReactNode; label: string; category: string }> = {
  'user.login':           { icon: <LogIn size={12} />,        label: 'User signed in',         category: 'Auth' },
  'user.logout':          { icon: <LogIn size={12} />,        label: 'User signed out',         category: 'Auth' },
  'user.invited':         { icon: <UserPlus size={12} />,     label: 'User invited',           category: 'Team' },
  'user.role_changed':    { icon: <Shield size={12} />,       label: 'Role changed',           category: 'Team' },
  'bot.published':        { icon: <Bot size={12} />,          label: 'Bot published',          category: 'Bot' },
  'bot.created':          { icon: <Bot size={12} />,          label: 'Bot created',            category: 'Bot' },
  'flow.updated':         { icon: <RefreshCw size={12} />,    label: 'Flow updated',           category: 'Build' },
  'flow.published':       { icon: <CheckCircle2 size={12} />, label: 'Flow published',         category: 'Build' },
  'template.submitted':   { icon: <FileText size={12} />,     label: 'Template submitted',     category: 'Engage' },
  'template.approved':    { icon: <CheckCircle2 size={12} />, label: 'Template approved',      category: 'Engage' },
  'channel.connected':    { icon: <Globe size={12} />,        label: 'Channel connected',      category: 'Config' },
  'channel.disconnected': { icon: <Globe size={12} />,        label: 'Channel disconnected',   category: 'Config' },
  'webhook.created':      { icon: <Send size={12} />,         label: 'Webhook created',        category: 'Config' },
  'webhook.deleted':      { icon: <Trash2 size={12} />,       label: 'Webhook deleted',        category: 'Config' },
  'settings.updated':     { icon: <Settings size={12} />,     label: 'Settings updated',       category: 'Settings' },
  'api_key.created':      { icon: <Key size={12} />,          label: 'API key created',        category: 'Auth' },
  'api_key.revoked':      { icon: <Key size={12} />,          label: 'API key revoked',        category: 'Auth' },
  'knowledge.synced':     { icon: <RefreshCw size={12} />,    label: 'Knowledge synced',       category: 'Build' },
  'contact.deleted':      { icon: <Trash2 size={12} />,       label: 'Contact deleted',        category: 'Inbox' },
}

const SEVERITY_VARIANT: Record<AuditSeverity, 'info' | 'success' | 'warning' | 'error'> = {
  info: 'info', success: 'success', warning: 'warning', error: 'error',
}

const MOCK_EVENTS: AuditEvent[] = [
  { id: 'A-001', actor: { name: 'Charles', email: 'charles@acme.com' }, action: 'bot.published', resource: 'Acme Support Bot', details: 'Published to Production environment', ip: '82.10.45.12', timestamp: '2m ago', severity: 'success' },
  { id: 'A-002', actor: { name: 'Sarah K', email: 'sarah@acme.com' }, action: 'flow.updated', resource: 'Welcome Flow', details: 'Updated 3 nodes: Send Message, Ask Question, Condition', ip: '192.168.1.45', timestamp: '18m ago', severity: 'info' },
  { id: 'A-003', actor: { name: 'Charles', email: 'charles@acme.com' }, action: 'template.approved', resource: 'Order Confirmation', details: 'WhatsApp template approved by provider', ip: '82.10.45.12', timestamp: '45m ago', severity: 'success' },
  { id: 'A-004', actor: { name: 'Charles', email: 'charles@acme.com' }, action: 'user.invited', resource: 'lucy@acme.com', details: 'Invited with role: Agent', ip: '82.10.45.12', timestamp: '1h ago', severity: 'info' },
  { id: 'A-005', actor: { name: 'Mike R', email: 'mike@acme.com' }, action: 'user.login', resource: 'ybot-console', details: 'Signed in via email/password', ip: '10.0.0.55', timestamp: '2h ago', severity: 'info' },
  { id: 'A-006', actor: { name: 'Tom B', email: 'tom@acme.com' }, action: 'knowledge.synced', resource: 'acme.com/help', details: 'Crawled 284 pages, generated 1,204 chunks', ip: '10.0.0.77', timestamp: '2h ago', severity: 'success' },
  { id: 'A-007', actor: { name: 'Charles', email: 'charles@acme.com' }, action: 'webhook.created', resource: 'WH-004', details: 'Created webhook: https://slack.com/services/…', ip: '82.10.45.12', timestamp: '3h ago', severity: 'info' },
  { id: 'A-008', actor: { name: 'System', email: 'system@ybot.io' }, action: 'channel.disconnected', resource: 'SMS (Twilio)', details: 'SMS channel auth failed — token expired', ip: 'system', timestamp: '5h ago', severity: 'error' },
  { id: 'A-009', actor: { name: 'Sarah K', email: 'sarah@acme.com' }, action: 'flow.published', resource: 'Product FAQ', details: 'Published to Production (v4)', ip: '192.168.1.45', timestamp: '8h ago', severity: 'success' },
  { id: 'A-010', actor: { name: 'Charles', email: 'charles@acme.com' }, action: 'api_key.created', resource: 'API key #3', details: 'Created API key with read-only scope', ip: '82.10.45.12', timestamp: '1d ago', severity: 'warning' },
  { id: 'A-011', actor: { name: 'Charles', email: 'charles@acme.com' }, action: 'user.role_changed', resource: 'Sarah K', details: 'Changed role from Agent → Supervisor', ip: '82.10.45.12', timestamp: '2d ago', severity: 'warning' },
  { id: 'A-012', actor: { name: 'Anna W', email: 'anna@acme.com' }, action: 'contact.deleted', resource: 'contact#8821', details: 'Permanently deleted contact record', ip: '172.16.0.32', timestamp: '3d ago', severity: 'error' },
]

const CATEGORIES = Array.from(new Set(Object.values(ACTION_CFG).map((a) => a.category)))

function formatAuditTime(iso?: string) {
  if (!iso) return '?'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 2) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function AuditPage() {
  const { data: apiEvents = [] } = useAuditLog()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'all'>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Map API audit events to display shape (fall back to static mock if API not available)
  const events: AuditEvent[] = apiEvents.length > 0
    ? apiEvents.map((e) => ({
        id: e.id,
        actor: { name: e.user?.displayName ?? 'System', email: e.user?.email ?? '' },
        action: (e.action in ACTION_CFG ? e.action : 'user.login') as AuditEvent['action'],
        resource: (e.resource ?? '—'),
        details: JSON.stringify(e.metadata ?? {}),
        ip: (e.metadata?.ip ?? 'unknown') as string,
        timestamp: formatAuditTime(e.createdAt),
        severity: ('info') as AuditSeverity,
      }))
    : MOCK_EVENTS

  const filtered = events.filter((e) => {
    const matchSearch = !search ||
      e.actor.name.toLowerCase().includes(search.toLowerCase()) ||
      ACTION_CFG[e.action]?.label?.toLowerCase().includes(search.toLowerCase()) ||
      e.resource.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'all' || ACTION_CFG[e.action]?.category === categoryFilter
    const matchSev = severityFilter === 'all' || e.severity === severityFilter
    return matchSearch && matchCat && matchSev
  })

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)] pb-3">Admin</h1>
        <SubNav items={SUBNAV} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0 flex-wrap">
        <Input placeholder="Search events, actors, resources…" leftIcon={<Search size={13} />} value={search} onChange={(e) => setSearch(e.target.value)} className="w-72" />

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <Filter size={13} />
              {categoryFilter === 'all' ? 'All categories' : categoryFilter}
              <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setCategoryFilter('all')}>All categories</DropdownMenuItem>
            {CATEGORIES.map((c) => (
              <DropdownMenuItem key={c} onClick={() => setCategoryFilter(c)}>{c}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Severity filter */}
        <div className="flex gap-1">
          {(['all', 'info', 'success', 'warning', 'error'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors border',
                severityFilter === s ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-[var(--text-muted)]">{filtered.length} events</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border)] z-10">
            <tr>
              {['', 'Actor', 'Action', 'Resource', 'IP address', 'Timestamp', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev) => {
              const ac = ACTION_CFG[ev.action]
              const isExpanded = expanded.has(ev.id)
              return (
                <React.Fragment key={ev.id}>
                  <tr
                    className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
                    onClick={() => toggleExpand(ev.id)}
                  >
                    <td className="px-4 py-3 w-8">
                      <ChevronRight size={13} className={cn('text-[var(--text-muted)] transition-transform', isExpanded && 'rotate-90')} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={ev.actor.name} size="xs" />
                        <div>
                          <p className="text-xs font-medium text-[var(--text-primary)]">{ev.actor.name}</p>
                          <p className="text-[10px] text-[var(--text-muted)]">{ev.actor.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={SEVERITY_VARIANT[ev.severity]} className="gap-1 shrink-0">
                          {ac.icon} {ac.label}
                        </Badge>
                        <span className="text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">{ac.category}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-[var(--text-secondary)] max-w-xs truncate block">{ev.resource}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-[var(--text-muted)]">{ev.ip}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">{ev.timestamp}</td>
                    <td className="px-4 py-3 text-[11px] font-mono text-[var(--text-muted)]">{ev.id}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-overlay)]">
                      <td />
                      <td colSpan={6} className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Info size={13} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Event details</p>
                            <p className="text-xs text-[var(--text-muted)]">{ev.details}</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-[var(--text-muted)]">No events match your filters</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
