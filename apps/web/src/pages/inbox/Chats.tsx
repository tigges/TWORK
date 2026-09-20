import React, { useState } from 'react'
import { MessageSquare, Search, Filter, ChevronRight, Clock } from 'lucide-react'
import { Avatar, Badge, Input, Button } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Chats', path: '/inbox/chats' },
  { label: 'Tickets', path: '/inbox/tickets' },
  { label: 'Contacts', path: '/inbox/contacts' },
  { label: 'Settings', path: '/inbox/settings' },
]

const MOCK_CONVOS = [
  { id: '1', name: 'Alice Johnson', message: 'I need help with my order', time: '2m', status: 'active', unread: 3, channel: 'web', assignee: null },
  { id: '2', name: 'Bob Smith', message: 'How do I track my shipment?', time: '8m', status: 'active', unread: 1, channel: 'whatsapp', assignee: 'Sarah' },
  { id: '3', name: 'Carol White', message: 'Thanks for the help!', time: '24m', status: 'resolved', unread: 0, channel: 'web', assignee: 'Sarah' },
  { id: '4', name: 'David Lee', message: 'Product not delivered yet', time: '1h', status: 'escalated', unread: 2, channel: 'sms', assignee: null },
  { id: '5', name: 'Eve Brown', message: 'Can I change my address?', time: '2h', status: 'active', unread: 0, channel: 'web', assignee: 'Mike' },
]

const MOCK_MESSAGES = [
  { id: '1', from: 'user', name: 'Alice Johnson', text: 'Hi! I need help with my order #12345', time: '10:32 AM' },
  { id: '2', from: 'bot', name: 'YBot', text: 'Hello! I can help you with that. Can you please share your order number?', time: '10:32 AM' },
  { id: '3', from: 'user', name: 'Alice Johnson', text: 'It\'s order #12345, placed 3 days ago', time: '10:33 AM' },
  { id: '4', from: 'bot', name: 'YBot', text: 'I found your order. It\'s currently in transit and expected to arrive tomorrow by 6 PM.', time: '10:33 AM' },
  { id: '5', from: 'user', name: 'Alice Johnson', text: 'Great, thank you! Can I change the delivery address?', time: '10:35 AM' },
  { id: '6', from: 'agent', name: 'Sarah K', text: 'Hi Alice! Sarah here. I can definitely help you update the delivery address. Could you share the new address?', time: '10:36 AM' },
]

export function ChatsPage() {
  const [selectedId, setSelectedId] = useState<string | null>('1')
  const [reply, setReply] = useState('')

  const selected = MOCK_CONVOS.find((c) => c.id === selectedId)

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list */}
      <div className="flex w-80 flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] shrink-0">
        <div className="border-b border-[var(--border)]">
          <div className="px-4 pt-4 pb-0">
            <h1 className="text-base font-semibold text-[var(--text-primary)]">Inbox</h1>
          </div>
          <SubNav items={SUBNAV} />
        </div>

        <div className="p-3 border-b border-[var(--border)]">
          <Input
            placeholder="Search conversations…"
            leftIcon={<Search size={13} />}
          />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]">
          {MOCK_CONVOS.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedId(conv.id)}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                selectedId === conv.id ? 'bg-[var(--bg-selected)]' : 'hover:bg-[var(--bg-hover)]'
              )}
            >
              <Avatar name={conv.name} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">{conv.name}</span>
                  <span className="text-xs text-[var(--text-muted)] shrink-0 ml-2">{conv.time}</span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{conv.message}</p>
                <div className="mt-1 flex items-center gap-1">
                  <Badge variant={conv.status === 'active' ? 'info' : conv.status === 'escalated' ? 'error' : 'success'} dot>
                    {conv.status}
                  </Badge>
                  {conv.unread > 0 && (
                    <span className="ml-auto text-[10px] font-bold text-white bg-[var(--accent)] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat thread */}
      {selected ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex h-[var(--topbar-height)] items-center justify-between border-b border-[var(--border)] px-4 shrink-0">
            <div className="flex items-center gap-3">
              <Avatar name={selected.name} size="sm" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{selected.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{selected.channel} · {selected.assignee ? `Assigned to ${selected.assignee}` : 'Unassigned'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">Resolve</Button>
              <Button variant="ghost" size="icon-sm"><ChevronRight size={14} /></Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {MOCK_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex gap-2.5', msg.from === 'user' ? 'flex-row' : 'flex-row-reverse')}
              >
                <Avatar name={msg.name} size="sm" />
                <div className={cn('max-w-[70%]', msg.from === 'user' ? '' : '')}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">{msg.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{msg.time}</span>
                  </div>
                  <div className={cn(
                    'rounded-[var(--radius-md)] px-3 py-2 text-sm',
                    msg.from === 'user'
                      ? 'bg-[var(--bg-overlay)] text-[var(--text-primary)]'
                      : msg.from === 'bot'
                        ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border border-[var(--accent)]/20'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]'
                  )}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reply box */}
          <div className="border-t border-[var(--border)] p-4 shrink-0">
            <div className="flex gap-2">
              <Input
                placeholder="Type a reply…"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                className="flex-1"
              />
              <Button disabled={!reply.trim()}>Send</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-[var(--text-muted)]">Select a conversation</p>
        </div>
      )}

      {/* Contact context panel */}
      {selected && (
        <div className="w-64 shrink-0 border-l border-[var(--border)] bg-[var(--bg-surface)] overflow-y-auto p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Contact Info</h3>
          <div className="flex flex-col items-center gap-2 mb-4">
            <Avatar name={selected.name} size="lg" />
            <p className="font-medium text-[var(--text-primary)] text-sm">{selected.name}</p>
            <Badge variant="muted">{selected.channel}</Badge>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Status', value: selected.status },
              { label: 'Channel', value: selected.channel },
              { label: 'Assigned to', value: selected.assignee ?? 'Unassigned' },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] font-medium uppercase text-[var(--text-muted)]">{item.label}</p>
                <p className="text-sm text-[var(--text-primary)] mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
