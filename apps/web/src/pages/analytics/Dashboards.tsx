import React, { useState } from 'react'
import {
  LayoutDashboard, Plus, MoreHorizontal, Pin, Pencil, Trash2,
  BarChart3, MessageSquare, UserCheck, ThumbsUp, Globe, Star,
  FileText, Clock, Download, Mail, CalendarDays, RefreshCw,
  ChevronRight, Copy,
} from 'lucide-react'
import { Button, Badge } from '@ybot/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Overview', path: '/analytics' },
  { label: 'Dashboards', path: '/analytics/dashboards' },
  { label: 'Reports', path: '/analytics/reports' },
]

// ── Dashboards ──────────────────────────────────────────────────────────────
interface Dashboard {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  metrics: number
  updatedAt: string
  pinned: boolean
  author: string
  tags: string[]
}

const MOCK_DASHBOARDS: Dashboard[] = [
  {
    id: 'bot-perf', name: 'Bot Performance', description: 'Conversation volume, resolution rate, top intents, flow completion rates',
    icon: <BarChart3 size={20} />, metrics: 8, updatedAt: '1h ago', pinned: true, author: 'Charles', tags: ['bot', 'conversations'],
  },
  {
    id: 'agent-eff', name: 'Agent Efficiency', description: 'Handle time, CSAT scores, queue depth, SLA compliance per agent',
    icon: <UserCheck size={20} />, metrics: 6, updatedAt: '3h ago', pinned: true, author: 'Charles', tags: ['agents', 'sla'],
  },
  {
    id: 'csat', name: 'CSAT Analysis', description: 'Customer satisfaction trends, response breakdowns, NPS over time',
    icon: <ThumbsUp size={20} />, metrics: 5, updatedAt: '1d ago', pinned: false, author: 'Sarah K', tags: ['csat', 'nps'],
  },
  {
    id: 'channels', name: 'Channel Overview', description: 'Volume and resolution by channel: Web, WhatsApp, SMS, Email',
    icon: <Globe size={20} />, metrics: 7, updatedAt: '2d ago', pinned: false, author: 'Charles', tags: ['channels'],
  },
  {
    id: 'inbox', name: 'Inbox Metrics', description: 'First response time, queue wait, conversation assignment and escalation',
    icon: <MessageSquare size={20} />, metrics: 9, updatedAt: '3d ago', pinned: false, author: 'Mike R', tags: ['inbox'],
  },
  {
    id: 'campaigns', name: 'Campaign Performance', description: 'Open rates, click rates, delivery success across all active campaigns',
    icon: <Star size={20} />, metrics: 6, updatedAt: '1w ago', pinned: false, author: 'Charles', tags: ['campaigns', 'engage'],
  },
]

function DashboardCard({ dash, onPin }: { dash: Dashboard; onPin: (id: string) => void }) {
  return (
    <div className={cn(
      'group rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-5 cursor-pointer transition-all hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-md)]',
      dash.pinned ? 'border-[var(--accent)]/30 bg-[var(--accent-muted)]/10' : 'border-[var(--border)]'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-[var(--radius-md)]', dash.pinned ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]')}>
          {dash.icon}
        </div>
        <div className="flex items-center gap-1">
          {dash.pinned && <Badge variant="info" className="text-[10px]">Pinned</Badge>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all">
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPin(dash.id) }}>
                <Pin size={13} /> {dash.pinned ? 'Unpin' : 'Pin to top'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}><Pencil size={13} /> Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}><Copy size={13} /> Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onClick={(e) => e.stopPropagation()}><Trash2 size={13} /> Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h3 className="font-semibold text-[var(--text-primary)] mb-1">{dash.name}</h3>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-2 mb-3">{dash.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {dash.tags.map((t) => (
          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border)]">{t}</span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-3 border-t border-[var(--border)]">
        <span>{dash.metrics} widgets</span>
        <span>{dash.author} · {dash.updatedAt}</span>
      </div>
    </div>
  )
}

export function DashboardsPage() {
  const [dashboards, setDashboards] = useState<Dashboard[]>(MOCK_DASHBOARDS)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTemplate, setNewTemplate] = useState('blank')

  function togglePin(id: string) {
    setDashboards((prev) => prev.map((d) => d.id === id ? { ...d, pinned: !d.pinned } : d))
  }

  const pinned = dashboards.filter((d) => d.pinned)
  const rest = dashboards.filter((d) => !d.pinned)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Analytics</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Dashboard
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {pinned.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
              <Pin size={11} /> Pinned
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pinned.map((d) => <DashboardCard key={d.id} dash={d} onPin={togglePin} />)}
            </div>
          </section>
        )}
        <section>
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">All dashboards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {rest.map((d) => <DashboardCard key={d.id} dash={d} onPin={togglePin} />)}
          </div>
        </section>
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>New dashboard</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Dashboard name *</label>
              <input
                autoFocus
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="e.g. Weekly Bot Summary"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-2 block">Start from a template</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'blank', label: 'Blank dashboard', icon: <LayoutDashboard size={16} /> },
                  { id: 'bot', label: 'Bot performance', icon: <BarChart3 size={16} /> },
                  { id: 'agent', label: 'Agent efficiency', icon: <UserCheck size={16} /> },
                  { id: 'csat', label: 'CSAT analysis', icon: <ThumbsUp size={16} /> },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setNewTemplate(t.id)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-[var(--radius-md)] border text-left text-sm transition-colors',
                      newTemplate === t.id
                        ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!newName.trim()} onClick={() => setShowNew(false)}>Create dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Reports ─────────────────────────────────────────────────────────────────
type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'one-time'
type ReportFormat = 'csv' | 'xlsx' | 'pdf'
type ReportStatus = 'scheduled' | 'running' | 'ready' | 'failed'

interface Report {
  id: string
  name: string
  type: string
  frequency: ReportFrequency
  format: ReportFormat
  status: ReportStatus
  lastRun?: string
  nextRun?: string
  recipients: number
  size?: string
}

const MOCK_REPORTS: Report[] = [
  { id: 'R-001', name: 'Weekly conversation summary', type: 'Conversation', frequency: 'weekly', format: 'xlsx', status: 'ready', lastRun: '2d ago', nextRun: 'In 5 days', recipients: 3, size: '42KB' },
  { id: 'R-002', name: 'Daily CSAT digest', type: 'CSAT', frequency: 'daily', format: 'pdf', status: 'ready', lastRun: '8h ago', nextRun: 'Tomorrow 08:00', recipients: 5, size: '18KB' },
  { id: 'R-003', name: 'Monthly agent performance', type: 'Agent', frequency: 'monthly', format: 'xlsx', status: 'scheduled', nextRun: 'Oct 1, 09:00', recipients: 2 },
  { id: 'R-004', name: 'Bot analytics — Q3 2026', type: 'Bot analytics', frequency: 'one-time', format: 'pdf', status: 'ready', lastRun: '1w ago', recipients: 4, size: '128KB' },
  { id: 'R-005', name: 'Channel breakdown report', type: 'Channel', frequency: 'weekly', format: 'csv', status: 'running', lastRun: '5m ago', nextRun: 'In 7 days', recipients: 1 },
  { id: 'R-006', name: 'Campaign performance Q3', type: 'Campaign', frequency: 'one-time', format: 'xlsx', status: 'failed', lastRun: '3d ago', recipients: 2 },
]

const STATUS_CFG: Record<ReportStatus, { label: string; variant: 'success' | 'info' | 'warning' | 'error' | 'muted'; icon: React.ReactNode }> = {
  ready:     { label: 'Ready',     variant: 'success', icon: <Download size={11} /> },
  scheduled: { label: 'Scheduled', variant: 'info',    icon: <CalendarDays size={11} /> },
  running:   { label: 'Running',   variant: 'warning', icon: <RefreshCw size={11} className="animate-spin" /> },
  failed:    { label: 'Failed',    variant: 'error',   icon: <MoreHorizontal size={11} /> },
}

const FREQ_CFG: Record<ReportFrequency, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', 'one-time': 'One-time',
}

export function ReportsPage() {
  const [reports] = useState<Report[]>(MOCK_REPORTS)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Analytics</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Report
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 px-6 py-2.5 bg-[var(--bg-overlay)] border-b border-[var(--border)] shrink-0">
        {[
          { label: 'Total reports', value: reports.length },
          { label: 'Ready to download', value: reports.filter((r) => r.status === 'ready').length },
          { label: 'Scheduled', value: reports.filter((r) => r.status === 'scheduled' || r.frequency !== 'one-time').length },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{s.value}</span>
            <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border)] z-10">
            <tr>
              {['Report', 'Type', 'Frequency', 'Format', 'Status', 'Last run', 'Next run', 'Recipients', ''].map((h) => (
                <th key={h} className="px-5 py-2.5 text-left text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {reports.map((r) => {
              const sc = STATUS_CFG[r.status]
              return (
                <tr key={r.id} className="hover:bg-[var(--bg-hover)] transition-colors group">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-[var(--text-muted)] shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{r.name}</p>
                        <p className="text-[11px] text-[var(--text-muted)]">{r.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-secondary)]">{r.type}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{FREQ_CFG[r.frequency]}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-[11px] font-mono uppercase text-[var(--text-muted)] border border-[var(--border)] px-1.5 py-0.5 rounded">{r.format}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={sc.variant} className="gap-1">{sc.icon} {sc.label}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{r.lastRun ?? '—'}</td>
                  <td className="px-5 py-3 text-xs text-[var(--text-muted)]">{r.nextRun ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]"><Mail size={11} /> {r.recipients}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {r.status === 'ready' && (
                        <button className="p-1.5 rounded hover:bg-[var(--bg-overlay)] text-[var(--accent)] transition-colors" title="Download">
                          <Download size={13} />
                        </button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] transition-colors">
                            <MoreHorizontal size={13} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><RefreshCw size={13} /> Run now</DropdownMenuItem>
                          <DropdownMenuItem><Pencil size={13} /> Edit</DropdownMenuItem>
                          <DropdownMenuItem><Copy size={13} /> Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive><Trash2 size={13} /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New report dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>New report</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Report name *</label>
              <input
                autoFocus
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="e.g. Monthly agent summary"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Report type</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Conversation</option><option>CSAT</option><option>Agent performance</option>
                  <option>Bot analytics</option><option>Channel breakdown</option><option>Campaign</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Format</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Excel (.xlsx)</option><option>CSV</option><option>PDF</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Date range</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Last 7 days</option><option>Last 30 days</option><option>Last 90 days</option><option>Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Schedule</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>One-time</option><option>Daily</option><option>Weekly</option><option>Monthly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Send to (email addresses)</label>
              <input
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="admin@acme.com, sarah@acme.com…"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button variant="secondary" disabled={!newName.trim()}>Save &amp; schedule</Button>
            <Button disabled={!newName.trim()} onClick={() => setShowNew(false)}>Run now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
