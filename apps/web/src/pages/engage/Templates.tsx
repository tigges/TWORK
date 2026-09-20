import React, { useState } from 'react'
import {
  Plus, Search, Filter, MoreHorizontal, FileText,
  CheckCircle2, Clock, AlertCircle, Edit2, Copy, Trash2,
  Mail, MessageSquare, Phone, Globe, Eye,
} from 'lucide-react'
import { Badge, Button, Input } from '@ybot/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'
import { useTemplates } from '../../lib/hooks'

const SUBNAV = [
  { label: 'Campaigns', path: '/engage/campaigns' },
  { label: 'Templates', path: '/engage/templates' },
]

type ApprovalStatus = 'approved' | 'pending' | 'rejected' | 'draft'
type TemplateChannel = 'email' | 'whatsapp' | 'sms' | 'web'
type TemplateCategory = 'marketing' | 'transactional' | 'support' | 'utility'

interface Template {
  id: string
  name: string
  channel: TemplateChannel
  category: TemplateCategory
  status: ApprovalStatus
  language: string
  body: string
  usedIn: number
  createdAt: string
  updatedAt: string
}

const MOCK_TEMPLATES: Template[] = [
  {
    id: 'T-001', name: 'Black Friday Sale', channel: 'email', category: 'marketing', status: 'approved',
    language: 'en', body: "🛍️ Our biggest sale of the year is here! Get up to 60% off on everything. Use code BLACKFRIDAY at checkout. Shop now →",
    usedIn: 3, createdAt: '2w ago', updatedAt: '3d ago',
  },
  {
    id: 'T-002', name: 'Order Confirmation', channel: 'whatsapp', category: 'transactional', status: 'approved',
    language: 'en', body: "Hi {{1}}! Your order #{{2}} has been confirmed and will be delivered by {{3}}. Track your order here: {{4}}",
    usedIn: 8, createdAt: '1m ago', updatedAt: '1w ago',
  },
  {
    id: 'T-003', name: 'Cart Recovery', channel: 'email', category: 'marketing', status: 'approved',
    language: 'en', body: "Hey {{1}}, you left something behind! Your cart is waiting. Complete your purchase today and save 10% with code COMEBACK.",
    usedIn: 2, createdAt: '3w ago', updatedAt: '5d ago',
  },
  {
    id: 'T-004', name: 'Re-engagement Nudge', channel: 'whatsapp', category: 'marketing', status: 'pending',
    language: 'en', body: "Hi {{1}}! We miss you 👋 It's been a while since your last visit. Here's 15% off your next order: {{2}}",
    usedIn: 1, createdAt: '1w ago', updatedAt: '1d ago',
  },
  {
    id: 'T-005', name: 'OTP Verification', channel: 'sms', category: 'utility', status: 'approved',
    language: 'en', body: "Your YBot verification code is {{1}}. Valid for 10 minutes. Do not share this code with anyone.",
    usedIn: 12, createdAt: '2m ago', updatedAt: '2m ago',
  },
  {
    id: 'T-006', name: 'Shipping Update', channel: 'sms', category: 'transactional', status: 'approved',
    language: 'en', body: "Your order #{{1}} is out for delivery! Expected arrival: {{2}}. Track: {{3}}",
    usedIn: 5, createdAt: '1m ago', updatedAt: '1w ago',
  },
  {
    id: 'T-007', name: 'Promo Banner', channel: 'web', category: 'marketing', status: 'draft',
    language: 'en', body: "🎉 Limited time offer! Get free shipping on orders over £50. Use code FREESHIP at checkout.",
    usedIn: 0, createdAt: '2d ago', updatedAt: '2d ago',
  },
  {
    id: 'T-008', name: 'Support Ticket Created', channel: 'email', category: 'support', status: 'approved',
    language: 'en', body: "Hi {{1}}, your support ticket #{{2}} has been created. Our team will respond within 24 hours. View your ticket: {{3}}",
    usedIn: 4, createdAt: '2m ago', updatedAt: '2m ago',
  },
  {
    id: 'T-009', name: 'Onboarding Welcome', channel: 'email', category: 'utility', status: 'rejected',
    language: 'en', body: "Welcome to YBot, {{1}}! 🎉 Get started by setting up your first bot. Watch the 2-min intro video here: {{2}}",
    usedIn: 0, createdAt: '5d ago', updatedAt: '2d ago',
  },
]

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'muted'; icon: React.ReactNode }> = {
  approved: { label: 'Approved', variant: 'success', icon: <CheckCircle2 size={11} /> },
  pending: { label: 'Pending review', variant: 'warning', icon: <Clock size={11} /> },
  rejected: { label: 'Rejected', variant: 'error', icon: <AlertCircle size={11} /> },
  draft: { label: 'Draft', variant: 'muted', icon: <Edit2 size={11} /> },
}

const CHANNEL_ICONS: Record<TemplateChannel, React.ReactNode> = {
  email: <Mail size={13} />,
  whatsapp: <MessageSquare size={13} />,
  sms: <Phone size={13} />,
  web: <Globe size={13} />,
}

const CHANNEL_COLORS: Record<TemplateChannel, 'info' | 'success' | 'warning' | 'muted'> = {
  email: 'info', whatsapp: 'success', sms: 'warning', web: 'muted',
}

export function TemplatesPage() {
  const { data: rawTemplates = [] } = useTemplates()
  const templates = rawTemplates as unknown as Template[]
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<TemplateChannel | 'all'>('all')
  const [preview, setPreview] = useState<Template | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newBody, setNewBody] = useState('')

  const filtered = templates.filter((t) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchChannel = channelFilter === 'all' || t.channel === channelFilter
    return matchSearch && matchChannel
  })

  const categories = ['all', 'marketing', 'transactional', 'support', 'utility'] as const

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
          placeholder="Search templates…"
          leftIcon={<Search size={13} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />

        {/* Channel filter pills */}
        <div className="flex gap-1">
          {(['all', 'email', 'whatsapp', 'sms', 'web'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors border',
                channelFilter === ch
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
              )}
            >
              {ch === 'all' ? 'All channels' : ch}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 px-6 py-2.5 bg-[var(--bg-overlay)] border-b border-[var(--border)] shrink-0">
        {[
          { label: 'Total', value: templates.length },
          { label: 'Approved', value: templates.filter((t) => t.status === 'approved').length },
          { label: 'Pending review', value: templates.filter((t) => t.status === 'pending').length },
          { label: 'Rejected', value: templates.filter((t) => t.status === 'rejected').length },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{s.value}</span>
            <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Template grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((t) => {
            const st = STATUS_CONFIG[t.status] ?? STATUS_CONFIG['draft']
            return (
              <div
                key={t.id}
                className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden hover:border-[var(--accent)]/40 transition-colors group cursor-pointer"
                onClick={() => setPreview(t)}
              >
                {/* Card header */}
                <div className="flex items-start justify-between p-4 pb-3 border-b border-[var(--border)]">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="mt-0.5 text-[var(--text-muted)]">{CHANNEL_ICONS[t.channel]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant={CHANNEL_COLORS[t.channel]}>{t.channel}</Badge>
                        <span className="text-[10px] text-[var(--text-muted)] capitalize">{t.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Badge variant={st.variant} className="gap-0.5 shrink-0">{st.icon}{st.label}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all">
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setPreview(t) }}>
                          <Eye size={13} /> Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit2 size={13} /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Copy size={13} /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onClick={(e) => { e.stopPropagation(); /* template delete would call API */ }}>
                          <Trash2 size={13} /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Body preview */}
                <div className="px-4 py-3">
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">{t.body}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-overlay)] border-t border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                  <span>{(t.language ?? 'EN').toUpperCase()} · {t.usedIn ?? 0} campaign{(t.usedIn ?? 0) !== 1 ? 's' : ''}</span>
                  <span>Updated {t.updatedAt}</span>
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center">
              <FileText size={32} className="text-[var(--text-muted)] mb-3" />
              <p className="text-sm font-medium text-[var(--text-primary)]">No templates found</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Try a different search or filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null) }}>
        {preview && (
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>{preview.name}</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={CHANNEL_COLORS[preview.channel]}>{CHANNEL_ICONS[preview.channel]}{preview.channel}</Badge>
                <Badge variant="muted" className="capitalize">{preview.category}</Badge>
                <Badge variant={STATUS_CONFIG[preview.status].variant}>{STATUS_CONFIG[preview.status].icon}{STATUS_CONFIG[preview.status].label}</Badge>
                <span className="text-xs text-[var(--text-muted)] flex items-center">{preview.language.toUpperCase()}</span>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] p-4">
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{preview.body}</p>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Variables like <code className="bg-[var(--bg-overlay)] px-1 rounded font-mono">{`{{1}}`}</code> are filled at send time.
                Used in {preview.usedIn} campaign{preview.usedIn !== 1 ? 's' : ''}.
              </p>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPreview(null)}>Close</Button>
              <Button className="gap-1.5"><Edit2 size={13} /> Edit template</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* New template dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Template name *</label>
              <input
                autoFocus
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="e.g. Order Confirmation"
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
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Category</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Marketing</option><option>Transactional</option><option>Support</option><option>Utility</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Message body *</label>
              <textarea
                rows={5}
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder={`Use {{1}}, {{2}} for dynamic variables.\n\ne.g. Hi {{1}}, your order #{{2}} is confirmed!`}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button variant="secondary" disabled={!newName.trim()}>Save as draft</Button>
            <Button disabled={!newName.trim() || !newBody.trim()} onClick={() => setShowNew(false)}>Submit for review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
