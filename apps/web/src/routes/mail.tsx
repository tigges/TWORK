import { useEffect, useState } from 'react'
import { Mail, PenLine, X } from 'lucide-react'
import { trpc } from '../trpc.js'

export function MailPage() {
  const utils = trpc.useUtils()
  const address = trpc.mail.address.useQuery()
  const list = trpc.mail.list.useQuery()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)

  const selected = list.data?.find(row => row.id === selectedId) ?? list.data?.[0] ?? null
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
        <div className="flex-1 overflow-auto">
          {list.isLoading && <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>}
          {list.data?.length === 0 && (
            <div className="px-6 py-16 text-center">
              <Mail className="mx-auto mb-3 text-zinc-300" size={28} />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                Mail sent to {address.data?.address ?? 'your address'} will show up here.
              </p>
            </div>
          )}
          {list.data?.map(row => {
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
          replyToId={replyTo}
          onClose={() => setComposing(false)}
          onSent={async () => {
            setComposing(false)
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
        <p className="mt-2 text-sm">{row.direction === 'outbound' ? 'To' : 'From'} {row.direction === 'outbound' ? row.toAddresses?.join(', ') : row.fromAddress}</p>
        <p className="text-xs text-zinc-500">
          {row.direction === 'outbound' ? 'From' : 'To'} {row.direction === 'outbound' ? row.fromAddress : row.toAddresses?.join(', ')}
          {' · '}
          {new Date(row.receivedAt).toLocaleString()}
        </p>
      </header>
      <div className="flex-1 overflow-auto px-8 py-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-6">{row.textBody || ''}</pre>
      </div>
    </article>
  )
}

function Compose({
  replyToId,
  onClose,
  onSent,
}: {
  replyToId: string | null
  onClose: () => void
  onSent: () => Promise<void>
}) {
  const reply = trpc.mail.get.useQuery({ id: replyToId ?? '00000000-0000-0000-0000-000000000000' }, {
    enabled: !!replyToId,
  })
  const send = trpc.mail.send.useMutation()
  const contacts = trpc.contacts.list.useQuery({})
  const [to, setTo] = useState('')
  const [toOpen, setToOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [text, setText] = useState('')
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
    await send.mutateAsync({
      to,
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
        <label className="relative flex items-center gap-3 border-b border-zinc-100 px-4 py-2 text-sm dark:border-zinc-800">
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
          {toOpen && <ContactMatches query={to} contacts={contacts.data ?? []} onPick={email => { setTo(email); setToOpen(false) }} />}
        </label>
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
        {send.error && <p className="px-4 pb-2 text-xs text-red-600">{send.error.message}</p>}
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
