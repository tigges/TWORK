import React, { useState } from 'react'
import {
  Repeat2, Plus, Play, Pause, Pencil, Trash2, MoreHorizontal,
  Zap, Clock, MessageSquare, Globe, ToggleLeft, ToggleRight,
  ChevronRight, AlertCircle,
} from 'lucide-react'
import { Badge, Button } from '@ybot/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@ybot/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Flows', path: '/build/flows' },
  { label: 'Workflows', path: '/build/workflows' },
]

type TriggerKind = 'conversation.resolved' | 'message.received' | 'contact.created' | 'ticket.created' | 'schedule' | 'intent_matched'
type WorkflowStatus = 'active' | 'paused' | 'draft'

interface WorkflowRule {
  id: string
  name: string
  description: string
  trigger: TriggerKind
  conditions: string
  actions: string[]
  status: WorkflowStatus
  runCount: number
  lastRun?: string
}

const TRIGGER_LABELS: Record<TriggerKind, { label: string; icon: React.ReactNode }> = {
  'conversation.resolved': { label: 'Conversation resolved', icon: <MessageSquare size={12} /> },
  'message.received':      { label: 'Message received',      icon: <MessageSquare size={12} /> },
  'contact.created':       { label: 'Contact created',        icon: <Globe size={12} /> },
  'ticket.created':        { label: 'Ticket created',         icon: <AlertCircle size={12} /> },
  'schedule':              { label: 'Scheduled',              icon: <Clock size={12} /> },
  'intent_matched':        { label: 'Intent matched',         icon: <Zap size={12} /> },
}

const MOCK_WORKFLOWS: WorkflowRule[] = [
  { id: 'W-001', name: 'CSAT Survey after resolve', description: 'Trigger CSAT survey flow 5 minutes after conversation is resolved', trigger: 'conversation.resolved', conditions: 'channel = web OR whatsapp', actions: ['Wait 5min', 'Trigger flow: CSAT Survey'], status: 'active', runCount: 312, lastRun: '2m ago' },
  { id: 'W-002', name: 'Auto-assign VIP contacts', description: 'Route conversations from VIP contacts to the senior agents team', trigger: 'message.received', conditions: 'contact.metadata.vip = true', actions: ['Assign to: Senior Agents', 'Add label: vip'], status: 'active', runCount: 48, lastRun: '45m ago' },
  { id: 'W-003', name: 'Create ticket on escalation', description: 'Automatically create a support ticket when a conversation is escalated', trigger: 'conversation.resolved', conditions: 'status = escalated', actions: ['Create ticket', 'Notify: supervisor@acme.com'], status: 'active', runCount: 77, lastRun: '1h ago' },
  { id: 'W-004', name: 'New contact to HubSpot', description: 'Push newly captured contacts to HubSpot CRM automatically', trigger: 'contact.created', conditions: 'contact.email is set', actions: ['HTTP POST: HubSpot /contacts', 'Set variable: crm_synced = true'], status: 'paused', runCount: 94, lastRun: '3d ago' },
  { id: 'W-005', name: 'Daily summary email', description: 'Send a daily report email to admins at 09:00 every weekday', trigger: 'schedule', conditions: 'cron: 0 9 * * 1-5', actions: ['Generate report: daily_summary', 'Email to: admin@acme.com'], status: 'active', runCount: 45, lastRun: '4h ago' },
  { id: 'W-006', name: 'Billing intent alert', description: 'Alert the billing team when a billing intent is matched in a conversation', trigger: 'intent_matched', conditions: 'intent = billing_query', actions: ['Add label: billing', 'Assign to: Billing Team'], status: 'draft', runCount: 0 },
]

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRule[]>(MOCK_WORKFLOWS)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTrigger, setNewTrigger] = useState<TriggerKind>('conversation.resolved')

  function toggleStatus(id: string) {
    setWorkflows((prev) => prev.map((w) =>
      w.id === id ? { ...w, status: w.status === 'active' ? 'paused' : 'active' } : w
    ))
  }

  const active = workflows.filter((w) => w.status === 'active').length

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Flows</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Workflow
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 px-6 py-2.5 bg-[var(--bg-overlay)] border-b border-[var(--border)] shrink-0">
        {[
          { label: 'Total', value: workflows.length },
          { label: 'Active', value: active },
          { label: 'Runs today', value: workflows.reduce((s, w) => s + w.runCount, 0) },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{s.value.toLocaleString()}</span>
            <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-3">
        {workflows.map((w) => {
          const trig = TRIGGER_LABELS[w.trigger]
          return (
            <div
              key={w.id}
              className={cn(
                'rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-4 group transition-all',
                w.status === 'active' ? 'border-[var(--border)]' :
                w.status === 'paused' ? 'border-[var(--warning,#fbbf24)]/20 bg-[var(--warning,#fbbf24)]/5' :
                'border-dashed border-[var(--border)]'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn('p-2 rounded-[var(--radius-md)] shrink-0', w.status === 'active' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]')}>
                    <Zap size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{w.name}</h3>
                      <Badge variant={w.status === 'active' ? 'success' : w.status === 'paused' ? 'warning' : 'muted'} className="capitalize">{w.status}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-2">{w.description}</p>

                    {/* Trigger + condition chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent)] font-medium">
                        {trig.icon} When: {trig.label}
                      </span>
                      <ChevronRight size={11} className="text-[var(--text-muted)]" />
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border)] font-mono">{w.conditions}</span>
                      <ChevronRight size={11} className="text-[var(--text-muted)]" />
                      <div className="flex gap-1">
                        {w.actions.map((a, i) => (
                          <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-overlay)] text-[var(--text-secondary)] border border-[var(--border)]">{a}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-semibold text-[var(--text-primary)]">{w.runCount.toLocaleString()} runs</p>
                    {w.lastRun && <p className="text-[10px] text-[var(--text-muted)]">Last: {w.lastRun}</p>}
                  </div>
                  <button
                    onClick={() => toggleStatus(w.id)}
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                    title="Toggle"
                  >
                    {w.status === 'active'
                      ? <ToggleRight size={22} className="text-[var(--accent)]" />
                      : <ToggleLeft size={22} />
                    }
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] transition-all">
                        <MoreHorizontal size={14} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem><Pencil size={13} /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus(w.id)}>
                        {w.status === 'active' ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Activate</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive><Trash2 size={13} /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>New workflow</DialogTitle></DialogHeader>
          <DialogBody className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Workflow name *</label>
              <input autoFocus className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40" placeholder="e.g. Route VIP conversations" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Trigger event</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TRIGGER_LABELS) as TriggerKind[]).map((t) => {
                  const tl = TRIGGER_LABELS[t]
                  return (
                    <button key={t} onClick={() => setNewTrigger(t)} className={cn('flex items-center gap-2 p-2.5 rounded-[var(--radius-md)] border text-left text-xs transition-colors', newTrigger === t ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]')}>
                      {tl.icon} {tl.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!newName.trim()} onClick={() => setShowNew(false)}>Create workflow</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
