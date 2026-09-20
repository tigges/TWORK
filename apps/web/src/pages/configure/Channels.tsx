import React, { useState } from 'react'
import {
  Globe, MessageSquare, Phone, Mail, Facebook, MonitorSmartphone,
  Send, CheckCircle2, Circle, Pencil, Trash2, Plus, Code2,
  Copy, ToggleLeft, ToggleRight, ExternalLink, AlertCircle, Wifi,
} from 'lucide-react'
import { Badge, Button } from '@ybot/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Channels', path: '/configure/channels' },
  { label: 'Integrations', path: '/configure/integrations' },
  { label: 'Database', path: '/configure/database' },
  { label: 'Webhooks', path: '/configure/webhooks' },
]

// ────────────────────────────────────────────────────────────────────────────
// Channels Page
// ────────────────────────────────────────────────────────────────────────────
type ChannelStatus = 'connected' | 'not_connected' | 'error'

interface Channel {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  status: ChannelStatus
  lastActivity?: string
  conversations?: number
  config?: Record<string, string>
}

const CHANNELS: Channel[] = [
  {
    id: 'web', name: 'Web Widget', description: 'Embeddable chat widget for your website',
    icon: <Globe size={22} />, status: 'connected', lastActivity: '2m ago', conversations: 383,
    config: { domain: 'acme.com', color: '#6366f1', position: 'bottom-right' },
  },
  {
    id: 'whatsapp', name: 'WhatsApp Business', description: 'Connect via WhatsApp Business API',
    icon: <MessageSquare size={22} />, status: 'connected', lastActivity: '5m ago', conversations: 255,
    config: { phone: '+44 7700 900000', business_id: 'WA-123456' },
  },
  {
    id: 'sms', name: 'SMS (Twilio)', description: 'Send and receive SMS via Twilio',
    icon: <Phone size={22} />, status: 'error', lastActivity: '3d ago', conversations: 127,
    config: { phone: '+44 1234 567890', account_sid: 'ACxxxx' },
  },
  {
    id: 'email', name: 'Email', description: 'Receive and reply to emails from a shared inbox',
    icon: <Mail size={22} />, status: 'connected', lastActivity: '1h ago', conversations: 86,
    config: { address: 'support@acme.com', imap_host: 'imap.gmail.com' },
  },
  {
    id: 'facebook', name: 'Facebook Messenger', description: 'Connect your Facebook Page inbox',
    icon: <Facebook size={22} />, status: 'not_connected',
  },
  {
    id: 'telegram', name: 'Telegram', description: 'Deploy a Telegram bot via BotFather API',
    icon: <Send size={22} />, status: 'not_connected',
  },
]

const STATUS_COLOR: Record<ChannelStatus, string> = {
  connected: 'text-[var(--success)]',
  not_connected: 'text-[var(--text-muted)]',
  error: 'text-[var(--error)]',
}

const STATUS_LABEL: Record<ChannelStatus, string> = {
  connected: 'Connected',
  not_connected: 'Not connected',
  error: 'Error',
}

const EMBED_CODE = `<script>
  window.YBotConfig = {
    botId: "acme-support-bot",
    color: "#6366f1",
    position: "bottom-right",
  };
</script>
<script src="https://cdn.ybot.io/widget.js" async></script>`

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>(CHANNELS)
  const [selected, setSelected] = useState<Channel | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [copied, setCopied] = useState(false)

  function toggleChannel(id: string) {
    setChannels((prev) => prev.map((c) =>
      c.id === id ? { ...c, status: c.status === 'connected' ? 'not_connected' : 'connected' } : c
    ))
  }

  function copyEmbed() {
    navigator.clipboard?.writeText(EMBED_CODE).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <div className="flex items-center justify-between pb-3">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Configure</h1>
          <Button size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Channel
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Stats bar */}
        <div className="flex items-center gap-6 mb-6">
          {[
            { label: 'Total channels', value: channels.length },
            { label: 'Connected', value: channels.filter((c) => c.status === 'connected').length },
            { label: 'Errors', value: channels.filter((c) => c.status === 'error').length },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-lg font-bold text-[var(--text-primary)]">{s.value}</span>
              <span className="text-xs text-[var(--text-muted)]">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className={cn(
                'rounded-[var(--radius-lg)] border bg-[var(--bg-surface)] p-5 cursor-pointer hover:border-[var(--accent)]/40 transition-colors group',
                ch.status === 'error' ? 'border-[var(--error)]/30' : 'border-[var(--border)]'
              )}
              onClick={() => setSelected(ch)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  'p-3 rounded-[var(--radius-md)]',
                  ch.status === 'connected' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' :
                  ch.status === 'error' ? 'bg-[var(--error-muted)] text-[var(--error)]' :
                  'bg-[var(--bg-overlay)] text-[var(--text-muted)]'
                )}>
                  {ch.icon}
                </div>
                <div className="flex items-center gap-2">
                  {ch.status === 'error' && <AlertCircle size={14} className="text-[var(--error)]" />}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleChannel(ch.id) }}
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                    title="Toggle"
                  >
                    {ch.status === 'connected'
                      ? <ToggleRight size={22} className="text-[var(--accent)]" />
                      : <ToggleLeft size={22} />
                    }
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-[var(--text-primary)] mb-1">{ch.name}</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">{ch.description}</p>

              <div className="flex items-center justify-between">
                <span className={cn('flex items-center gap-1.5 text-xs font-medium', STATUS_COLOR[ch.status])}>
                  {ch.status === 'connected' ? <CheckCircle2 size={12} /> : ch.status === 'error' ? <AlertCircle size={12} /> : <Circle size={12} />}
                  {STATUS_LABEL[ch.status]}
                </span>
                {ch.conversations && (
                  <span className="text-[11px] text-[var(--text-muted)]">{ch.conversations} conversations</span>
                )}
              </div>

              {ch.lastActivity && (
                <p className="text-[11px] text-[var(--text-muted)] mt-1">Last: {ch.lastActivity}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Channel detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null) }}>
        {selected && (
          <DialogContent size="md">
            <DialogHeader>
              <DialogTitle>{selected.name} settings</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)]">
                <span className={cn('p-2 rounded-[var(--radius-md)]', selected.status === 'connected' ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]')}>
                  {selected.icon}
                </span>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{selected.name}</p>
                  <p className={cn('text-xs font-medium', STATUS_COLOR[selected.status])}>{STATUS_LABEL[selected.status]}</p>
                </div>
              </div>

              {selected.config && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Configuration</p>
                  {Object.entries(selected.config).map(([k, v]) => (
                    <div key={k}>
                      <label className="text-xs font-medium text-[var(--text-muted)] capitalize mb-1 block">{k.replace(/_/g, ' ')}</label>
                      <input
                        defaultValue={v}
                        className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selected.id === 'web' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Embed code</label>
                    <Button variant="ghost" size="sm" className="gap-1.5 h-6 text-xs" onClick={() => setShowEmbed(true)}>
                      <Code2 size={11} /> View
                    </Button>
                  </div>
                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] px-3 py-2">
                    <code className="text-[11px] text-[var(--text-muted)] font-mono">&lt;script src="https://cdn.ybot.io/widget.js"&gt;…</code>
                  </div>
                </div>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
              <Button onClick={() => setSelected(null)}>Save changes</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Embed code dialog */}
      <Dialog open={showEmbed} onOpenChange={setShowEmbed}>
        <DialogContent size="md">
          <DialogHeader><DialogTitle>Web widget embed code</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              Paste this code snippet just before the closing <code className="font-mono text-xs bg-[var(--bg-overlay)] px-1 rounded">&lt;/body&gt;</code> tag of your website.
            </p>
            <div className="relative">
              <pre className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-overlay)] p-4 text-xs text-[var(--text-secondary)] font-mono overflow-x-auto leading-relaxed">
                {EMBED_CODE}
              </pre>
              <button
                onClick={copyEmbed}
                className="absolute top-2 right-2 px-2 py-1 rounded text-xs bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
              >
                {copied ? <CheckCircle2 size={11} className="text-[var(--success)]" /> : <Copy size={11} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button onClick={() => setShowEmbed(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add channel dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>Add a channel</DialogTitle></DialogHeader>
          <DialogBody>
            <p className="text-sm text-[var(--text-secondary)] mb-4">Choose a channel to connect.</p>
            <div className="space-y-2">
              {['Facebook Messenger', 'Telegram', 'Instagram DMs', 'LINE', 'Viber'].map((ch) => (
                <button key={ch} className="flex items-center justify-between w-full p-3 rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--bg-hover)] transition-colors text-left">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{ch}</span>
                  <ExternalLink size={13} className="text-[var(--text-muted)]" />
                </button>
              ))}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
