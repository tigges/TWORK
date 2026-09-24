import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Mail, PenLine, UserPlus, X } from 'lucide-react'
import { trpc } from '../trpc.js'

export function MailPage() {
  const utils = trpc.useUtils()
  const search = useSearch({ from: '/mail' })
  const address = trpc.mail.address.useQuery()
  const list = trpc.mail.list.useQuery()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composing, setComposing] = useState(!!search.to)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [box, setBox] = useState<'inbox' | 'sent'>('inbox')
  const [labelFilter, setLabelFilter] = useState<string | null>(null)

  const boxed = useMemo(
    () => (list.data ?? []).filter(row =>
      box === 'sent' ? row.direction === 'outbound' : row.direction !== 'outbound',
    ),
    [list.data, box],
  )
  const knownLabels = useMemo(() => {
    const seen = new Map<string, string>()
    for (const row of boxed) {
      for (const label of row.labels) {
        const key = label.toLowerCase()
        if (!seen.has(key)) seen.set(key, label)
      }
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [boxed])
  const activeFilter = knownLabels.some(label => label.toLowerCase() === labelFilter?.toLowerCase())
    ? labelFilter
    : null
  const rows = boxed.filter(row =>
    !activeFilter || row.labels.some(label => label.toLowerCase() === activeFilter.toLowerCase()),
  )

  useEffect(() => {
    if (!search.to) return
    setReplyTo(null)
    setComposing(true)
  }, [search.to])

  const selected = rows.find(row => row.id === selectedId) ?? rows[0] ?? null
  const activeId = selected?.id ?? null

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[340px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="min-w-0">
            <h1 className="text-sm font-semibold">Mail</h1>
            <p className="truncate text-xs text-zinc-500">{address.data?.address ?? ' '}</p>
          </div>
          <button
            type="button"
            onClick={() => { setReplyTo(null); setComposing(true) }}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          >
            <PenLine size={14} />
            Compose
          </button>
        </header>
        <div className="flex gap-1.5 overflow-x-auto border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <FilterChip active={box === 'inbox'} onClick={() => { setBox('inbox'); setSelectedId(null); setLabelFilter(null) }}>Inbox</FilterChip>
          <FilterChip active={box === 'sent'} onClick={() => { setBox('sent'); setSelectedId(null); setLabelFilter(null) }}>Sent</FilterChip>
          {knownLabels.map(label => (
            <FilterChip
              key={label.toLowerCase()}
              active={activeFilter?.toLowerCase() === label.toLowerCase()}
              onClick={() => setLabelFilter(label)}
            >
              {label}
            </FilterChip>
          ))}
        </div>
        <div className="flex-1 overflow-auto">
          {list.isLoading && <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>}
          {!list.isLoading && boxed.length === 0 && (
            <div className="px-6 py-16 text-center">
              <Mail className="mx-auto mb-3 text-zinc-300" size={28} />
              <p className="text-sm font-medium">{box === 'sent' ? 'Nothing sent yet' : 'Inbox is empty'}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {box === 'sent'
                  ? 'Messages you send show up here.'
                  : `Mail sent to ${address.data?.address ?? 'your address'} will show up here.`}
              </p>
            </div>
          )}
          {!list.isLoading && boxed.length > 0 && rows.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-500">No messages with this label.</p>
          )}
          {rows.map(row => {
            const unread = row.flags.includes('unread')
            const active = row.id === activeId
            const who = row.direction === 'outbound'
              ? `To ${row.toAddresses?.[0] ?? ''}`
              : (row.fromAddress ?? 'Unknown')
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className={[
                  'block w-full border-b border-zinc-100 px-4 py-3 text-left dark:border-zinc-800',
                  active ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
                ].join(' ')}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className={['truncate text-sm', unread ? 'font-semibold' : 'font-medium'].join(' ')}>
                    {who}
                  </span>
                  <time className="shrink-0 text-[11px] text-zinc-400">{formatWhen(row.receivedAt)}</time>
                </div>
                <p className={['truncate text-sm', unread ? 'font-medium' : 'text-zinc-600 dark:text-zinc-300'].join(' ')}>
                  {row.subject || '(no subject)'}
                </p>
                <p className="truncate text-xs text-zinc-400">{row.snippet || ' '}</p>
                {row.labels.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {row.labels.map(label => (
                      <span
                        key={label}
                        className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        {activeId
          ? <MessageView id={activeId} onReply={(id) => { setReplyTo(id); setComposing(true) }} />
          : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
              Select a message
            </div>
          )}
      </section>

      {composing && (
        <Compose
          key={`${replyTo ?? ''}:${search.to ?? ''}`}
          initialTo={search.to ?? ''}
          replyToId={replyTo}
          onClose={() => setComposing(false)}
          onSent={async () => {
            setComposing(false)
            setBox('sent')
            setLabelFilter(null)
            setSelectedId(null)
            await utils.mail.list.invalidate()
          }}
        />
      )}
    </div>
  )
}

function MessageView({ id, onReply }: { id: string; onReply: (id: string) => void }) {
  const utils = trpc.useUtils()
  const message = trpc.mail.get.useQuery({ id })
  const markRead = trpc.mail.markRead.useMutation({
    onSuccess: () => { void utils.mail.list.invalidate() },
  })

  useEffect(() => {
    if (message.data?.flags.includes('unread')) markRead.mutate({ id })
    // markRead identity changes each render; the id + unread flag are the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, message.data?.flags.join('|')])

  if (message.isLoading) return <p className="p-8 text-sm text-zinc-500">Loading…</p>
  if (!message.data) return <p className="p-8 text-sm text-zinc-500">Message not found.</p>

  const row = message.data
  const party = counterparty(row)
  return (
    <article className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-zinc-200 px-8 py-5 dark:border-zinc-800">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">{row.subject || '(no subject)'}</h2>
          <button
            type="button"
            onClick={() => onReply(row.id)}
            className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Reply
          </button>
        </div>
        <p className="mt-2 flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0 truncate">
            {row.direction === 'outbound' ? 'To' : 'From'} {row.direction === 'outbound' ? row.toAddresses?.join(', ') : row.fromAddress}
          </span>
          {party && <SaveContact email={party.email} name={party.name} />}
        </p>
        <p className="text-xs text-zinc-500">
          {row.direction === 'outbound' ? 'From' : 'To'} {row.direction === 'outbound' ? row.fromAddress : row.toAddresses?.join(', ')}
          {' · '}
          {new Date(row.receivedAt).toLocaleString()}
        </p>
        <CopyDisclosure cc={row.ccAddresses} bcc={row.bccAddresses} />
        <LabelEditor id={row.id} labels={row.labels} />
      </header>
      <div className="flex-1 overflow-auto px-8 py-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{row.textBody || ''}</pre>
      </div>
    </article>
  )
}

function Compose({
  initialTo,
  replyToId,
  onClose,
  onSent,
}: {
  initialTo: string
  replyToId: string | null
  onClose: () => void
  onSent: () => Promise<void>
}) {
  const reply = trpc.mail.get.useQuery({ id: replyToId ?? '00000000-0000-0000-0000-000000000000' }, {
    enabled: !!replyToId,
  })
  const send = trpc.mail.send.useMutation()
  const contacts = trpc.contacts.list.useQuery({})
  const [to, setTo] = useState(replyToId ? '' : initialTo)
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [ccOpen, setCcOpen] = useState(false)
  const [bccOpen, setBccOpen] = useState(false)
  const [toOpen, setToOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
  const [formError, setFormError] = useState('')
  const [ready, setReady] = useState(!replyToId)

  useEffect(() => {
    if (!reply.data || ready) return
    const email = extractEmail(reply.data.fromAddress ?? '')
    setTo(email)
    const sub = reply.data.subject ?? ''
    setSubject(sub.toLowerCase().startsWith('re:') ? sub : `Re: ${sub}`)
    setReady(true)
  }, [reply.data, ready])

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const ccList = splitAddresses(cc)
    const bccList = splitAddresses(bcc)
    const invalid = (label: string, list: string[]) => list.some(addr => !isEmail(addr))
      ? `${label} has an address that is not an email.`
      : list.length > 20
        ? `${label} can have at most 20 addresses.`
        : ''
    const problem = invalid('Cc', ccList) || invalid('Bcc', bccList)
    if (problem) {
      setFormError(problem)
      return
    }
    setFormError('')
    await send.mutateAsync({
      to,
      cc: ccList,
      bcc: bccList,
      subject,
      text,
      ...(reply.data?.messageIdHdr ? { inReplyTo: reply.data.messageIdHdr } : {}),
    })
    await onSent()
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">{replyToId ? 'Reply' : 'New message'}</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="relative flex items-center gap-3 border-b border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">
          <span className="w-14 text-zinc-400">To</span>
          <input
            value={to}
            onChange={e => { setTo(e.target.value); setToOpen(true) }}
            onFocus={() => setToOpen(true)}
            onBlur={() => setTimeout(() => setToOpen(false), 150)}
            required
            type="email"
            className="min-w-0 flex-1 bg-transparent outline-none"
          />
          <span className="flex shrink-0 gap-2">
            {!ccOpen && (
              <button type="button" onClick={() => setCcOpen(true)} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                {cc.trim() ? `Cc: ${shorten(cc)}` : 'Cc'}
              </button>
            )}
            {!bccOpen && (
              <button type="button" onClick={() => setBccOpen(true)} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                {bcc.trim() ? `Bcc: ${shorten(bcc)}` : 'Bcc'}
              </button>
            )}
          </span>
          {toOpen && <ContactMatches query={to} contacts={contacts.data ?? []} onPick={email => { setTo(email); setToOpen(false) }} />}
        </div>
        {ccOpen && (
          <CopyField
            label="Cc"
            value={cc}
            contacts={contacts.data ?? []}
            onChange={setCc}
            onCollapse={() => setCcOpen(false)}
          />
        )}
        {bccOpen && (
          <CopyField
            label="Bcc"
            value={bcc}
            contacts={contacts.data ?? []}
            onChange={setBcc}
            onCollapse={() => setBccOpen(false)}
          />
        )}
        <label className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">
          <span className="w-14 text-zinc-400">Subject</span>
          <input value={subject} onChange={e => setSubject(e.target.value)} required className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          required
          rows={10}
          className="resize-none bg-transparent px-4 py-3 text-sm outline-none"
        />
        {(formError || send.error) && (
          <p className="px-4 pb-2 text-xs text-red-600">{formError || send.error?.message}</p>
        )}
        <div className="flex justify-end px-4 py-3">
          <button
            type="submit"
            disabled={send.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}

function CopyField({
  label,
  value,
  contacts,
  onChange,
  onCollapse,
}: {
  label: string
  value: string
  contacts: { id: string; name: string; email: string }[]
  onChange: (value: string) => void
  onCollapse: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  useEffect(() => { input.current?.focus() }, [])
  const query = lastAddressToken(value)
  return (
    <div className="relative flex items-center gap-3 border-b border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">
      <button
        type="button"
        onClick={onCollapse}
        className="w-14 text-left text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
      >
        {label}
      </button>
      <input
        ref={input}
        value={value}
        onChange={event => { onChange(event.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Separate addresses with commas"
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-zinc-400"
      />
      {open && (
        <ContactMatches
          query={query}
          contacts={contacts}
          onPick={email => { onChange(pickAddress(value, email)); setOpen(false) }}
        />
      )}
    </div>
  )
}

function CopyDisclosure({ cc, bcc }: { cc: string[] | null; bcc: string[] | null }) {
  const ccList = cc ?? []
  const bccList = bcc ?? []
  if (ccList.length === 0 && bccList.length === 0) return null
  const parts = [
    ccList.length > 0 ? `Cc ${ccList.length}` : '',
    bccList.length > 0 ? `Bcc ${bccList.length}` : '',
  ].filter(Boolean)
  return (
    <details className="mt-1 text-xs text-zinc-500">
      <summary className="cursor-pointer select-none hover:text-zinc-800 dark:hover:text-zinc-200">
        {parts.join(' · ')}
      </summary>
      {ccList.length > 0 && <p className="mt-1">Cc {ccList.join(', ')}</p>}
      {bccList.length > 0 && <p className={ccList.length > 0 ? '' : 'mt-1'}>Bcc {bccList.join(', ')}</p>}
    </details>
  )
}

function ContactMatches({
  query,
  contacts,
  onPick,
}: {
  query:    string
  contacts: { id: string; name: string; email: string }[]
  onPick:   (email: string) => void
}) {
  const q = query.trim().toLowerCase()
  const matches = contacts.filter(row =>
    q.length === 0 || row.name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q),
  ).slice(0, 6)
  if (matches.length === 0) return null
  return (
    <ul className="absolute left-16 right-2 top-full z-10 mt-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      {matches.map(row => (
        <li key={row.id}>
          <button
            type="button"
            onMouseDown={event => { event.preventDefault(); onPick(row.email) }}
            className="block w-full px-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <span className="block text-sm">{row.name}</span>
            <span className="block text-xs text-zinc-500">{row.email}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function LabelEditor({ id, labels }: { id: string; labels: string[] }) {
  const utils = trpc.useUtils()
  const [draft, setDraft] = useState('')
  const setLabels = trpc.mail.setLabels.useMutation({
    onSuccess: async () => {
      setDraft('')
      await Promise.all([
        utils.mail.list.invalidate(),
        utils.mail.get.invalidate({ id }),
      ])
    },
  })

  function commit(next: string[]) {
    setLabels.mutate({ id, labels: next })
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const label = draft.trim().replace(/\s+/g, ' ')
    if (!label) return
    if (labels.some(existing => existing.toLowerCase() === label.toLowerCase())) {
      setDraft('')
      return
    }
    commit([...labels, label])
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {labels.map(label => (
        <span
          key={label}
          className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200"
        >
          {label}
          <button
            type="button"
            aria-label={`Remove ${label}`}
            disabled={setLabels.isPending}
            onClick={() => commit(labels.filter(existing => existing.toLowerCase() !== label.toLowerCase()))}
            className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-100"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <form onSubmit={onSubmit}>
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder="Add label"
          maxLength={40}
          aria-label="Add label"
          className="w-28 rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-xs outline-none placeholder:text-zinc-400 focus:border-indigo-400 dark:border-zinc-700"
        />
      </form>
      {setLabels.error && <span className="text-xs text-red-600">{setLabels.error.message}</span>}
    </div>
  )
}

function SaveContact({ email, name }: { email: string; name: string }) {
  const utils = trpc.useUtils()
  const contacts = trpc.contacts.list.useQuery({})
  const create = trpc.contacts.create.useMutation({
    onSettled: () => { void utils.contacts.list.invalidate() },
  })
  const saved = contacts.data?.some(row => row.email.toLowerCase() === email.toLowerCase()) ?? false
  if (saved) return <span className="shrink-0 text-xs text-zinc-500">In Contacts</span>
  return (
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={create.isPending}
        onClick={() => create.mutate({ name, email })}
        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        <UserPlus size={12} />
        {create.isPending ? 'Saving…' : 'Add to Contacts'}
      </button>
      {create.error && <span className="max-w-40 text-xs text-red-600">{create.error.message}</span>}
    </span>
  )
}

function counterparty(row: {
  direction: string
  fromAddress: string | null
  toAddresses: string[] | null
}): { email: string; name: string } | null {
  const raw = row.direction === 'outbound'
    ? (row.toAddresses?.[0] ?? '')
    : (row.fromAddress ?? '')
  const email = extractEmail(raw).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return null
  const named = raw.match(/^\s*"?([^"<]*?)"?\s*</)
  const fromHeader = named?.[1]?.trim() ?? ''
  const name = (fromHeader || email.slice(0, email.indexOf('@'))).slice(0, 200)
  return { email, name }
}

function formatWhen(value: Date | string): string {
  const date = new Date(value)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function extractEmail(value: string): string {
  const match = value.match(/<([^>]+)>/)
  return (match?.[1] ?? value).trim()
}

function splitAddresses(value: string): string[] {
  return value.split(/[,;]/).map(part => part.trim()).filter(Boolean)
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function lastAddressToken(value: string): string {
  const parts = value.split(/[,;]/)
  return (parts[parts.length - 1] ?? '').trim()
}

function pickAddress(current: string, email: string): string {
  const parts = splitAddresses(current)
  const typed = lastAddressToken(current)
  if (parts.length > 0 && typed && !isEmail(typed)) parts.pop()
  if (!parts.some(part => part.toLowerCase() === email.toLowerCase())) parts.push(email)
  return parts.join(', ')
}

function shorten(value: string): string {
  const text = value.trim()
  return text.length > 28 ? `${text.slice(0, 25)}…` : text
}
