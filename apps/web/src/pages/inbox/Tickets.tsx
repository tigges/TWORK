import React, { useState } from 'react'
import {
  Plus, Search, Filter, ChevronDown, MoreHorizontal,
  AlertTriangle, Clock, CheckCircle2, Circle, ArrowUpRight,
  User, MessageSquare, Tag, Calendar,
} from 'lucide-react'
import { Avatar, Badge, Button, Input } from '@ybot/ui'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from '@ybot/ui'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Chats', path: '/inbox/chats' },
  { label: 'Tickets', path: '/inbox/tickets' },
  { label: 'Contacts', path: '/inbox/contacts' },
  { label: 'Settings', path: '/inbox/settings' },
]

type Priority = 'urgent' | 'high' | 'normal' | 'low'
type TicketStatus = 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed'

interface Ticket {
  id: string
  title: string
  priority: Priority
  status: TicketStatus
  assignee: string | null
  contact: string
  channel: string
  createdAt: string
  messages: number
  labels?: string[]
}

const MOCK_TICKETS: Ticket[] = [
  { id: 'T-001', title: 'Order #12345 not delivered after 5 days', priority: 'urgent', status: 'open', assignee: null, contact: 'Alice Johnson', channel: 'web', createdAt: '2h ago', messages: 4, labels: ['delivery'] },
  { id: 'T-002', title: 'Double charge on last invoice', priority: 'high', status: 'open', assignee: 'Sarah K', contact: 'Frank Moore', channel: 'email', createdAt: '3h ago', messages: 2, labels: ['billing'] },
  { id: 'T-003', title: 'Cannot update account email address', priority: 'normal', status: 'open', assignee: 'Mike R', contact: 'Grace Park', channel: 'web', createdAt: '5h ago', messages: 6 },
  { id: 'T-004', title: 'App crashes on iOS 17.4 when opening chat', priority: 'urgent', status: 'in_progress', assignee: 'Tom B', contact: 'Henry Kim', channel: 'web', createdAt: '1d ago', messages: 9, labels: ['technical'] },
  { id: 'T-005', title: 'Refund request for cancelled subscription', priority: 'high', status: 'in_progress', assignee: 'Sarah K', contact: 'Iris Chen', channel: 'email', createdAt: '1d ago', messages: 3, labels: ['billing', 'refund'] },
  { id: 'T-006', title: 'WhatsApp integration not sending messages', priority: 'normal', status: 'pending', assignee: 'Tom B', contact: 'James Liu', channel: 'whatsapp', createdAt: '2d ago', messages: 7 },
  { id: 'T-007', title: 'Promo code SAVE20 not working at checkout', priority: 'normal', status: 'pending', assignee: null, contact: 'Karen Ng', channel: 'web', createdAt: '2d ago', messages: 2 },
  { id: 'T-008', title: 'Wrong item shipped in order #98765', priority: 'high', status: 'resolved', assignee: 'Mike R', contact: 'Leo Wang', channel: 'web', createdAt: '3d ago', messages: 8, labels: ['delivery'] },
  { id: 'T-009', title: 'Password reset email not received', priority: 'low', status: 'resolved', assignee: 'Sarah K', contact: 'Mia Patel', channel: 'email', createdAt: '4d ago', messages: 3 },
  { id: 'T-010', title: 'Billing address cannot be updated', priority: 'low', status: 'closed', assignee: 'Tom B', contact: 'Nick Davis', channel: 'web', createdAt: '5d ago', messages: 5, labels: ['billing'] },
]

const COLUMNS: { status: TicketStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { status: 'open', label: 'Open', icon: <Circle size={13} />, color: 'text-[var(--text-muted)]' },
  { status: 'in_progress', label: 'In Progress', icon: <Clock size={13} />, color: 'text-[var(--accent)]' },
  { status: 'pending', label: 'Pending', icon: <AlertTriangle size={13} />, color: 'text-[var(--warning,#fbbf24)]' },
  { status: 'resolved', label: 'Resolved', icon: <CheckCircle2 size={13} />, color: 'text-[var(--success)]' },
  { status: 'closed', label: 'Closed', icon: <CheckCircle2 size={13} />, color: 'text-[var(--text-muted)]' },
]

const PRIORITY_CONFIG: Record<Priority, { label: string; variant: 'error' | 'warning' | 'info' | 'muted'; dot: boolean }> = {
  urgent: { label: 'Urgent', variant: 'error', dot: true },
  high: { label: 'High', variant: 'warning', dot: true },
  normal: { label: 'Normal', variant: 'info', dot: false },
  low: { label: 'Low', variant: 'muted', dot: false },
}

function TicketCard({ ticket, onMove }: { ticket: Ticket; onMove: (id: string, status: TicketStatus) => void }) {
  const p = PRIORITY_CONFIG[ticket.priority]
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-3 hover:border-[var(--accent)]/40 transition-colors cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[11px] font-mono text-[var(--text-muted)]">{ticket.id}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-all">
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuSeparator />
            {COLUMNS.filter((c) => c.status !== ticket.status).map((c) => (
              <DropdownMenuItem key={c.status} onClick={() => onMove(ticket.id, c.status)}>
                Move to {c.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-sm text-[var(--text-primary)] font-medium leading-snug mb-2 line-clamp-2">
        {ticket.title}
      </p>

      <div className="flex flex-wrap gap-1 mb-2">
        <Badge variant={p.variant} dot={p.dot}>{p.label}</Badge>
        {ticket.labels?.map((l) => (
          <span key={l} className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border)]">
            {l}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[11px]">
            <User size={11} /> {ticket.contact}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1">
            <MessageSquare size={11} /> {ticket.messages}
          </span>
          <span>{ticket.createdAt}</span>
        </div>
      </div>

      {ticket.assignee && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--border)]">
          <Avatar name={ticket.assignee} size="xs" />
          <span className="text-[11px] text-[var(--text-muted)]">{ticket.assignee}</span>
        </div>
      )}
    </div>
  )
}

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>(MOCK_TICKETS)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [search, setSearch] = useState('')

  const filtered = tickets.filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.includes(search))

  function moveTicket(id: string, status: TicketStatus) {
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t))
  }

  function createTicket() {
    if (!newTitle.trim()) return
    const t: Ticket = {
      id: `T-${String(tickets.length + 1).padStart(3, '0')}`,
      title: newTitle,
      priority: 'normal',
      status: 'open',
      assignee: null,
      contact: 'Unknown',
      channel: 'web',
      createdAt: 'Just now',
      messages: 0,
    }
    setTickets((prev) => [...prev, t])
    setNewTitle('')
    setShowNew(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Inbox</h1>
        <SubNav items={SUBNAV} />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
        <Input
          placeholder="Search tickets…"
          leftIcon={<Search size={13} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Filter size={13} /> Filter
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-[var(--radius-md)] border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setView('kanban')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors', view === 'kanban' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]')}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-colors', view === 'list' ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]')}
            >
              List
            </button>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Ticket
          </Button>
        </div>
      </div>

      {/* Kanban / List body */}
      {view === 'kanban' ? (
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-4 p-4 min-w-max">
            {COLUMNS.map((col) => {
              const colTickets = filtered.filter((t) => t.status === col.status)
              return (
                <div key={col.status} className="flex flex-col w-[260px] shrink-0">
                  <div className={cn('flex items-center gap-1.5 mb-3 px-1', col.color)}>
                    {col.icon}
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className="ml-auto text-xs font-medium bg-[var(--bg-overlay)] px-1.5 py-0.5 rounded-full text-[var(--text-muted)]">
                      {colTickets.length}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {colTickets.map((t) => (
                      <TicketCard key={t.id} ticket={t} onMove={moveTicket} />
                    ))}
                    {colTickets.length === 0 && (
                      <div className="flex items-center justify-center h-24 rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border)]">
                        <p className="text-xs text-[var(--text-muted)]">No tickets</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--bg-surface)] border-b border-[var(--border)]">
              <tr>
                {['ID', 'Title', 'Priority', 'Status', 'Assignee', 'Contact', 'Created'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((t) => {
                const p = PRIORITY_CONFIG[t.priority]
                const col = COLUMNS.find((c) => c.status === t.status)!
                return (
                  <tr key={t.id} className="hover:bg-[var(--bg-hover)] transition-colors cursor-pointer">
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">{t.id}</td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <p className="text-sm text-[var(--text-primary)] truncate">{t.title}</p>
                      {t.labels && t.labels.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {t.labels.map((l) => <span key={l} className="text-[10px] text-[var(--text-muted)]">#{l}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5"><Badge variant={p.variant} dot={p.dot}>{p.label}</Badge></td>
                    <td className="px-4 py-2.5">
                      <span className={cn('flex items-center gap-1 text-xs font-medium', col.color)}>
                        {col.icon} {col.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {t.assignee ? (
                        <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                          <Avatar name={t.assignee} size="xs" /> {t.assignee}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-secondary)]">{t.contact}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-muted)]">{t.createdAt}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New ticket dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Create new ticket</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Title *</label>
              <input
                autoFocus
                className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="Describe the issue…"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createTicket() }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Priority</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Normal</option><option>High</option><option>Urgent</option><option>Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Assign to</label>
                <select className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none">
                  <option>Unassigned</option><option>Sarah K</option><option>Mike R</option><option>Tom B</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Description</label>
              <textarea
                rows={3}
                className="w-full resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                placeholder="Additional details…"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!newTitle.trim()} onClick={createTicket}>Create ticket</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
