import React, { useState } from 'react'
import {
  Plus, Search, Filter, MoreHorizontal, Megaphone,
  Calendar, Users, BarChart2, Play, Pause, CheckCircle2,
  Clock, AlertCircle, Send, ChevronRight,
} from 'lucide-react'
import { Avatar, Badge, Button, Input } from '@ybot/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Campaigns', path: '/engage/campaigns' },
  { label: 'Templates', path: '/engage/templates' },
]

type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'completed' | 'paused' | 'failed'
type CampaignChannel = 'email' | 'whatsapp' | 'sms' | 'web'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  channel: CampaignChannel
  audience: number
  sent?: number
  opened?: number
  clicked?: number
  scheduledAt?: string
  createdAt: string
  template?: string
}

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'C-001', name: 'Black Friday 2026 — Email blast', status: 'scheduled', channel: 'email', audience: 12450, scheduledAt: 'Nov 27, 9:00 AM', createdAt: '2d ago', template: 'Black Friday Sale' },
  { id: 'C-002', name: 'WhatsApp re-engagement — Inactive 30d', status: 'running', channel: 'whatsapp', audience: 3200, sent: 1842, opened: 1220, clicked: 345, createdAt: '1d ago', template: 'Re-engagement Nudge' },
  { id: 'C-003', name: 'Product launch SMS — Early access', status: 'completed', channel: 'sms', audience: 820, sent: 820, opened: 820, clicked: 210, createdAt: '5d ago' },
  { id: 'C-004', name: 'Onboarding drip — New signups', status: 'running', channel: 'email', audience: 5600, sent: 4300, opened: 2900, clicked: 980, createdAt: '1w ago', template: 'Onboarding Welcome' },
  { id: 'C-005', name: 'Cart abandonment — 24h reminder', status: 'paused', channel: 'email', audience: 2100, sent: 700, opened: 420, clicked: 88, createdAt: '1w ago', template: 'Cart Recovery' },
  { id: 'C-006', name: 'Cyber Monday push — Web channel', status: 'draft', channel: 'web', audience: 0, createdAt: '3h ago', template: 'Promo Banner' },
  { id: 'C-007', name: 'Survey — NPS Q3 2026', status: 'failed', channel: 'email', audience: 8000, sent: 120, createdAt: '3d ago' },
]

const STATUS_CONFIG: Record<CampaignStatus, { label: string; variant: 'info' | 'success' | 'error' | 'warning' | 'muted'; icon: React.ReactNode }> = {
  draft: { label: 'Draft', variant: 'muted', icon: <Clock size={11} /> },
  scheduled: { label: 'Scheduled', variant: 'info', icon: <Calendar size={11} /> },
  running: { label: 'Running', variant: 'success', icon: <Play size={11} /> },
  completed: { label: 'Completed', variant: 'success', icon: <CheckCircle2 size={11} /> },
  paused: { label: 'Paused', variant: 'warning', icon: <Pause size={11} /> },
  failed: { label: 'Failed', variant: 'error', icon: <AlertCircle size={11} /> },
}

function pct(a?: number, b?: number): string {
  if (!a || !b) return '—'
  return `${((a / b) * 100).toFixed(1)}%`
}

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = campaigns.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Engage</h1>
        <SubNav items={SUBNAV} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
        <Input
          placeholder="Search campaigns…"
          leftIcon={<Search size={13} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button variant="ghost" size="sm" className="gap-1.5"><Filter size={13} /> Filter</Button>
        <div className="ml-auto">
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Campaign
          </Button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-4 gap-px bg-[var(--border)] border-b border-[var(--border)] shrink-0">
        {[
          { label: 'Total campaigns', value: campaigns.length, icon: <Megaphone size={14} />, sub: `${campaigns.filter((c) => c.status === 'running').length} running` },
          { label: 'Total audience', value: campaigns.reduce((s, c) => s + c.audience, 0).toLocaleString(), icon: <Users size={14} />, sub: 'across all campaigns' },
          { label: 'Total sent', value: campaigns.reduce((s, c) => s + (c.sent ?? 0), 0).toLocaleString(), icon: <Send size={14} />, sub: 'messages delivered' },
          { label: 'Avg open rate', value: '53.2%', icon: <BarChart2 size={14} />, sub: '+4.1% vs last month' },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-surface)] px-5 py-4">
            <div className="flex items-center gap-2 mb-1 text-[var(--text-muted)]">{s.icon}<span className="text-[11px] uppercase tracking-wide font-medium">{s.label}</span></div>
            <p className="text-xl font-bold text-[var(--text-primary)]">{s.value}</p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border)] z-10">
            <tr>
              {['Campaign', 'Status', 'Channel', 'Audience', 'Sent', 'Open rate', 'Click rate', 'Date', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map((c) => {
              const st = STATUS_CONFIG[c.status]
              const chColor: Record<CampaignChannel, string> = { email: 'info', whatsapp: 'success', sms: 'warning', web: 'muted' }
              return (
                <tr key={c.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer group">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--text-primary)] max-w-xs truncate">{c.name}</p>
                    {c.template && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Template: {c.template}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={st.variant} className="gap-1">{st.icon}{st.label}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={chColor[c.channel] as 'info' | 'success' | 'warning' | 'muted'}>{c.channel}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">
                    {c.audience.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {c.sent?.toLocaleString() ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {c.opened && c.sent ? (
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{pct(c.opened, c.sent)}</span>
                        <div className="mt-1 h-1 w-16 rounded-full bg-[var(--bg-overlay)]">
                          <div className="h-1 rounded-full bg-[var(--accent)]" style={{ width: pct(c.opened, c.sent) }} />
                        </div>
                      </div>
                    ) : <span className="text-xs text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.clicked && c.sent
                      ? <span className="text-sm font-medium text-[var(--text-primary)]">{pct(c.clicked, c.sent)}</span>
                      : <span className="text-xs text-[var(--text-muted)]">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">
                    {c.scheduledAt ?? c.createdAt}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] transition-all">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View report</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        {c.status === 'running' && <DropdownMenuItem>Pause</DropdownMenuItem>}
                        {c.status === 'paused' && <DropdownMenuItem>Resume</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* New campaign dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Campaign name *</label>
              <input
                autoFocus
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="e.g. Black Friday 2026 — Email"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Channel</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Email</option><option>WhatsApp</option><option>SMS</option><option>Web</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Template</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Select template…</option>
                  <option>Black Friday Sale</option>
                  <option>Cart Recovery</option>
                  <option>Re-engagement Nudge</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Audience segment</label>
              <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                <option>All contacts</option>
                <option>Active last 30 days</option>
                <option>Inactive 30-90 days</option>
                <option>VIP customers</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Schedule</label>
              <div className="flex gap-2">
                <select className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Send immediately</option>
                  <option>Schedule for later</option>
                </select>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button variant="secondary" disabled={!newName.trim()}>Save as draft</Button>
            <Button disabled={!newName.trim()} onClick={() => setShowNew(false)}>Launch campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
