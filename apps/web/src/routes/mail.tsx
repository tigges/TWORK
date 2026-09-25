import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearch } from '@tanstack/react-router'
import { Mail, Paperclip, PenLine, RefreshCw, UserPlus, X } from 'lucide-react'
import { MailRow, type HoldCommit } from '../components/MailHold.js'
import { useSidebarOpen } from '../components/Shell.js'
import { type DownAction } from '../lib/mail-hold.js'
import { useAuth } from '../main.js'
import { trpc } from '../trpc.js'

export function MailPage() {
  const sidebarOpen = useSidebarOpen()
  const { user } = useAuth()
  const utils = trpc.useUtils()
  const search = useSearch({ from: '/mail' })
  const address = trpc.mail.address.useQuery()
  const list = trpc.mail.list.useQuery()
  const setImportant = trpc.mail.setImportant.useMutation()
  const setArchived = trpc.mail.setArchived.useMutation()
  const removeMail = trpc.mail.remove.useMutation()
  const restoreMail = trpc.mail.restore.useMutation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composing, setComposing] = useState(!!search.to)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [forwardId, setForwardId] = useState<string | null>(null)
  const [box, setBox] = useState<'inbox' | 'sent' | 'drafts' | 'spam'>('inbox')
  const [draftId, setDraftId] = useState<string | null>(null)
  const [labelFilter, setLabelFilter] = useState<string | null>(null)
  const [downDefault, setDownDefault] = useState<DownAction>('archive')
  const [notice, setNotice] = useState<{ text: string; undo?: () => Promise<void> } | null>(null)
  const noticeTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!user) return
    const saved = localStorage.getItem(downKey(user.id))
    if (saved === 'archive' || saved === 'delete') setDownDefault(saved)
  }, [user])

  function showNotice(text: string, undo?: () => Promise<void>) {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    setNotice({ text, ...(undo ? { undo } : {}) })
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6000)
  }

  function persistDown(next: DownAction) {
    setDownDefault(next)
    if (user) localStorage.setItem(downKey(user.id), next)
  }

  async function refreshMail() {
    await utils.mail.list.invalidate()
  }

  async function onHold(row: { id: string; flags: string[] }, action: HoldCommit, swapped: boolean) {
    try {
      if (action === 'important') {
        const on = !row.flags.includes('important')
        await setImportant.mutateAsync({ id: row.id, important: on })
        await refreshMail()
        showNotice(on ? 'Important' : 'Not important', async () => {
          await setImportant.mutateAsync({ id: row.id, important: !on })
          await refreshMail()
        })
        return
      }
      if (action === 'reply') {
        setForwardId(null)
        if (row.flags.includes('draft')) {
          setReplyTo(null)
          setDraftId(row.id)
        } else {
          setDraftId(null)
          setReplyTo(row.id)
        }
        setComposing(true)
        return
      }
      if (action === 'forward') {
        setReplyTo(null)
        setDraftId(null)
        setForwardId(row.id)
        setComposing(true)
        return
      }
      if (action === 'archive') {
        await setArchived.mutateAsync({ id: row.id, archived: true })
        if (swapped) persistDown('archive')
        await refreshMail()
        showNotice('Archived', async () => {
          await setArchived.mutateAsync({ id: row.id, archived: false })
          await refreshMail()
        })
        return
      }
      await removeMail.mutateAsync({ id: row.id })
      if (swapped) persistDown('delete')
      await refreshMail()
      showNotice('Deleted', async () => {
        await restoreMail.mutateAsync({ id: row.id })
        await refreshMail()
      })
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Could not do that')
    }
  }

  const boxed = useMemo(
    () => (list.data ?? []).filter(row => inBox(row, box)),
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
    setForwardId(null)
    setComposing(true)
  }, [search.to])

  const selected = rows.find(row => row.id === selectedId) ?? rows[0] ?? null
  const activeId = selected?.id ?? null

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[340px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <header className={['flex items-center justify-between gap-3 border-b border-zinc-200 py-3 dark:border-zinc-800', sidebarOpen ? 'px-4' : 'pl-14 pr-4'].join(' ')}>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold">Mail</h1>
            <p className="truncate text-xs text-zinc-500">{address.data?.address ?? ' '}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              title="Reload"
              aria-label="Reload mail"
              onClick={() => { void list.refetch() }}
              disabled={list.isRefetching}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800"
            >
              <RefreshCw size={14} className={list.isRefetching ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => { setReplyTo(null); setForwardId(null); setDraftId(null); setComposing(true) }}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            >
              <PenLine size={14} />
              Compose
            </button>
          </div>
        </header>
        <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <FilterChip active={box === 'inbox'} onClick={() => { setBox('inbox'); setSelectedId(null); setLabelFilter(null) }}>Inbox</FilterChip>
          <FilterChip active={box === 'sent'} onClick={() => { setBox('sent'); setSelectedId(null); setLabelFilter(null) }}>Sent</FilterChip>
          {box !== 'sent' && (
            <FilterChip active={box === 'drafts'} onClick={() => { setBox('drafts'); setSelectedId(null); setLabelFilter(null) }}>Drafts</FilterChip>
          )}
          {box !== 'sent' && (
            <FilterChip active={box === 'spam'} onClick={() => { setBox('spam'); setSelectedId(null); setLabelFilter(null) }}>Spam</FilterChip>
          )}
          <LabelFilter
            labels={knownLabels}
            active={activeFilter}
            onPick={setLabelFilter}
          />
        </div>
        <div className="flex-1 overflow-auto">
          {list.isLoading && <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>}
          {!list.isLoading && boxed.length === 0 && (
            <div className="px-6 py-16 text-center">
              <Mail className="mx-auto mb-3 text-zinc-300" size={28} />
              <p className="text-sm font-medium">{emptyTitle(box)}</p>
              <p className="mt-1 text-xs text-zinc-500">
                {box === 'inbox'
                  ? `Mail sent to ${address.data?.address ?? 'your address'} will show up here.`
                  : emptyDetail(box)}
              </p>
            </div>
          )}
          {!list.isLoading && boxed.length > 0 && rows.length === 0 && (
            <p className="px-4 py-6 text-sm text-zinc-500">No messages with this label.</p>
          )}
          {rows.map(row => {
            const who = row.direction === 'outbound'
              ? `To ${row.toAddresses?.[0] ?? ''}`
              : (row.fromAddress ?? 'Unknown')
            return (
              <MailRow
                key={row.id}
                who={who}
                when={formatWhen(row.receivedAt)}
                subject={row.subject || '(no subject)'}
                snippet={row.snippet}
                labels={row.labels}
                important={row.flags.includes('important')}
                unread={row.flags.includes('unread')}
                active={row.id === activeId}
                nearDown={downDefault}
                onOpen={() => setSelectedId(row.id)}
                onCommit={(action, swapped) => { void onHold(row, action, swapped) }}
              />
            )
          })}
        </div>
        {notice && (
          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-4 py-2 text-xs dark:border-zinc-800">
            <span className="text-zinc-500">{notice.text}</span>
            {notice.undo && (
              <button
                type="button"
                className="font-medium text-zinc-800 hover:text-zinc-950 dark:text-zinc-100"
                onClick={() => {
                  const run = notice.undo
                  setNotice(null)
                  if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
                  if (run) void run()
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        {activeId
          ? <MessageView
              id={activeId}
              onReply={(id) => { setDraftId(null); setForwardId(null); setReplyTo(id); setComposing(true) }}
              onEdit={(id) => { setReplyTo(null); setForwardId(null); setDraftId(id); setComposing(true) }}
            />
          : (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
              Select a message
            </div>
          )}
      </section>

      {composing && (
        <Compose
          key={`${replyTo ?? ''}:${forwardId ?? ''}:${draftId ?? ''}:${search.to ?? ''}`}
          initialTo={search.to ?? ''}
          replyToId={replyTo}
          forwardId={forwardId}
          draftId={draftId}
          onClose={() => setComposing(false)}
          onSent={async () => {
            setComposing(false)
            setDraftId(null)
            setBox('sent')
            setLabelFilter(null)
            setSelectedId(null)
            await utils.mail.list.invalidate()
          }}
          onDrafted={async (id) => {
            setComposing(false)
            setDraftId(id)
            setBox('drafts')
            setLabelFilter(null)
            setSelectedId(id)
            await utils.mail.list.invalidate()
          }}
        />
      )}
    </div>
  )
}

function MessageView({
  id,
  onReply,
  onEdit,
}: {
  id: string
  onReply: (id: string) => void
  onEdit: (id: string) => void
}) {
  const utils = trpc.useUtils()
  const message = trpc.mail.get.useQuery({ id })
  const markRead = trpc.mail.markRead.useMutation({
    onSuccess: () => { void utils.mail.list.invalidate() },
  })
  const setSpam = trpc.mail.setSpam.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.mail.list.invalidate(),
        utils.mail.get.invalidate({ id }),
      ])
    },
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
          <div className="flex shrink-0 gap-2">
            {row.flags.includes('draft') ? (
              <button
                type="button"
                onClick={() => onEdit(row.id)}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Edit
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onReply(row.id)}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Reply
              </button>
            )}
            {row.direction === 'inbound' && !row.flags.includes('draft') && (
              <button
                type="button"
                disabled={setSpam.isPending}
                onClick={() => setSpam.mutate({ id: row.id, spam: !row.flags.includes('spam') })}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {row.flags.includes('spam') ? 'Not spam' : 'Spam'}
              </button>
            )}
          </div>
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
        {row.attachments.length > 0 && (
          <div className="mt-6 flex flex-col gap-4">
            {row.attachments.map((file, index) => (
              <MailFile key={`${file.name}-${index}`} id={row.id} file={file} index={index} />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function Compose({
  initialTo,
  replyToId,
  forwardId,
  draftId,
  onClose,
  onSent,
  onDrafted,
}: {
  initialTo: string
  replyToId: string | null
  forwardId: string | null
  draftId: string | null
  onClose: () => void
  onSent: () => Promise<void>
  onDrafted: (id: string) => Promise<void>
}) {
  const reply = trpc.mail.get.useQuery({ id: replyToId ?? '00000000-0000-0000-0000-000000000000' }, {
    enabled: !!replyToId,
  })
  const forward = trpc.mail.get.useQuery({ id: forwardId ?? '00000000-0000-0000-0000-000000000000' }, {
    enabled: !!forwardId,
  })
  const draft = trpc.mail.get.useQuery({ id: draftId ?? '00000000-0000-0000-0000-000000000000' }, {
    enabled: !!draftId,
  })
  const send = trpc.mail.send.useMutation()
  const saveDraft = trpc.mail.saveDraft.useMutation()
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
  const [ready, setReady] = useState(!replyToId && !forwardId && !draftId)
  const [savedId, setSavedId] = useState<string | null>(draftId)
  const [files, setFiles] = useState<AttachedFile[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const loadedFiles = useRef(false)
  const sourceId = forwardId ?? draftId
  const attached = trpc.mail.files.useQuery(
    { id: sourceId ?? '00000000-0000-0000-0000-000000000000' },
    { enabled: !!sourceId },
  )

  useEffect(() => {
    if (!reply.data || ready) return
    const email = extractEmail(reply.data.fromAddress ?? '')
    setTo(email)
    const sub = reply.data.subject ?? ''
    setSubject(sub.toLowerCase().startsWith('re:') ? sub : `Re: ${sub}`)
    setReady(true)
  }, [reply.data, ready])

  useEffect(() => {
    if (!forward.data || ready) return
    const sub = forward.data.subject ?? ''
    setSubject(sub.toLowerCase().startsWith('fw:') ? sub : `Fw: ${sub}`)
    const when = new Date(forward.data.receivedAt).toLocaleString()
    const body = forward.data.textBody ?? ''
    setText(`\n\n---------- Forwarded message ----------\nFrom: ${forward.data.fromAddress ?? ''}\nDate: ${when}\nSubject: ${sub}\n\n${body}`)
    setReady(true)
  }, [forward.data, ready])

  useEffect(() => {
    if (!attached.data || loadedFiles.current) return
    loadedFiles.current = true
    if (attached.data.length > 0) setFiles(attached.data)
  }, [attached.data])

  useEffect(() => {
    if (!draft.data || ready) return
    setTo(draft.data.toAddresses?.[0] ?? '')
    setCc((draft.data.ccAddresses ?? []).join(', '))
    setBcc((draft.data.bccAddresses ?? []).join(', '))
    setCcOpen((draft.data.ccAddresses ?? []).length > 0)
    setBccOpen((draft.data.bccAddresses ?? []).length > 0)
    setSubject(draft.data.subject ?? '')
    setText(draft.data.textBody ?? '')
    setReady(true)
  }, [draft.data, ready])

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
    if (!isEmail(to)) {
      setFormError('To has an address that is not an email.')
      return
    }
    await send.mutateAsync({
      to,
      cc: ccList,
      bcc: bccList,
      subject,
      text,
      ...(reply.data?.messageIdHdr ? { inReplyTo: reply.data.messageIdHdr } : {}),
      ...(savedId ? { draftId: savedId } : {}),
      ...(files.length > 0 ? { attachments: files } : {}),
    })
    await onSent()
  }

  async function onSaveDraft() {
    const ccList = splitAddresses(cc)
    const bccList = splitAddresses(bcc)
    const invalid = (label: string, list: string[]) => list.some(addr => !isEmail(addr))
      ? `${label} has an address that is not an email.`
      : list.length > 20
        ? `${label} can have at most 20 addresses.`
        : ''
    const problem = (to.trim() && !isEmail(to.trim()) ? 'To has an address that is not an email.' : '')
      || invalid('Cc', ccList)
      || invalid('Bcc', bccList)
    if (problem) {
      setFormError(problem)
      return
    }
    setFormError('')
    const saved = await saveDraft.mutateAsync({
      ...(savedId ? { id: savedId } : {}),
      to: to.trim(),
      cc: ccList,
      bcc: bccList,
      subject,
      text,
      ...(files.length > 0 ? { attachments: files } : {}),
    })
    setSavedId(saved.id)
    await onDrafted(saved.id)
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-xl flex-col rounded-xl bg-white shadow-xl dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <h2 className="text-sm font-semibold">{replyToId ? 'Reply' : forwardId ? 'Forward' : draftId ? 'Draft' : 'New message'}</h2>
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
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pb-1">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {file.name}
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => setFiles(current => current.filter((_, i) => i !== index))}
                  className="text-zinc-400 hover:text-zinc-700"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        {(formError || send.error || saveDraft.error) && (
          <p className="px-4 pb-2 text-xs text-red-600">{formError || send.error?.message || saveDraft.error?.message}</p>
        )}
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              <Paperclip size={14} />
              Attach
            </button>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={event => { void addFiles(event.target.files, setFiles, setFormError); event.target.value = '' }}
            />
          </div>
          <div className="flex gap-2">
          {!replyToId && (
            <button
              type="button"
              disabled={saveDraft.isPending || send.isPending}
              onClick={() => { void onSaveDraft() }}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              {saveDraft.isPending ? 'Saving…' : 'Save draft'}
            </button>
          )}
          <button
            type="submit"
            disabled={send.isPending || saveDraft.isPending}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {send.isPending ? 'Sending…' : 'Send'}
          </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function MailFile({
  id,
  file,
  index,
}: {
  id: string
  file: { name: string; type: string; size: number }
  index: number
}) {
  const href = `/mail/files/${id}/${index}`
  const image = file.type.startsWith('image/')
  return (
    <div>
      {image && <img src={href} alt={file.name} className="max-h-96 max-w-full rounded-md" />}
      <a href={href} className={image ? 'mt-1 inline-block text-sm text-zinc-600 underline' : 'text-sm text-zinc-700 underline'}>
        {file.name}
      </a>
    </div>
  )
}

type AttachedFile = { name: string; type: string; data: string }

function addFiles(
  list: FileList | null,
  setFiles: (update: (current: AttachedFile[]) => AttachedFile[]) => void,
  setFormError: (message: string) => void,
) {
  const picked = [...(list ?? [])]
  if (picked.length === 0) return
  void (async () => {
    const next: AttachedFile[] = []
    for (const file of picked) {
      if (file.size > 8 * 1024 * 1024) {
        setFormError('Each attachment can be at most 8 MB.')
        return
      }
      next.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: await readAsBase64(file),
      })
    }
    setFiles(current => {
      const joined = [...current, ...next]
      if (joined.length > 8) {
        setFormError('You can attach up to 8 files.')
        return current
      }
      const total = joined.reduce((sum, item) => sum + Math.floor(item.data.length * 3 / 4), 0)
      if (total > 20 * 1024 * 1024) {
        setFormError('Attachments can be at most 20 MB together.')
        return current
      }
      setFormError('')
      return joined
    })
  })()
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = String(reader.result ?? '')
      resolve(value.slice(value.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
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
  contacts: { id: string; name: string; email: string; emails: string[] }[]
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
  contacts: { id: string; name: string; email: string; emails: string[] }[]
  onPick:   (email: string) => void
}) {
  const q = query.trim().toLowerCase()
  const matches = contacts.filter(row =>
    q.length === 0 || row.name.toLowerCase().includes(q) || row.emails.some(email => email.toLowerCase().includes(q)),
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

function LabelFilter({
  labels,
  active,
  onPick,
}: {
  labels: string[]
  active: string | null
  onPick: (label: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  if (labels.length === 0) return null
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className={[
          'rounded-full px-2.5 py-0.5 text-xs font-medium',
          active
            ? 'bg-indigo-600 text-white'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700',
        ].join(' ')}
      >
        {active ?? 'Filter'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-[9rem] rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {active && (
            <button
              type="button"
              onClick={() => { onPick(null); setOpen(false) }}
              className="block w-full px-3 py-1.5 text-left text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              Off
            </button>
          )}
          {labels.map(label => {
            const on = active?.toLowerCase() === label.toLowerCase()
            return (
              <button
                key={label.toLowerCase()}
                type="button"
                onClick={() => { onPick(on ? null : label); setOpen(false) }}
                className={[
                  'block w-full truncate px-3 py-1.5 text-left text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800',
                  on ? 'font-medium text-indigo-600' : 'text-zinc-700 dark:text-zinc-200',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
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
        'rounded-full px-2.5 py-0.5 text-xs font-medium',
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
  const saved = contacts.data?.some(row => row.emails.some(item => item.toLowerCase() === email.toLowerCase())) ?? false
  if (saved) return <span className="shrink-0 text-xs text-zinc-500">In Contacts</span>
  return (
    <span className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={create.isPending}
        onClick={() => create.mutate({ name, emails: [email] })}
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

function inBox(
  row: { direction: string; flags: string[] },
  box: 'inbox' | 'sent' | 'drafts' | 'spam',
): boolean {
  if (row.flags.includes('archived')) return false
  const draft = row.flags.includes('draft')
  const spam = row.flags.includes('spam')
  if (box === 'drafts') return draft
  if (box === 'spam') return spam && !draft
  if (box === 'sent') return row.direction === 'outbound' && !draft
  return row.direction !== 'outbound' && !spam && !draft
}

function downKey(userId: string): string {
  return `twork.mailDown.${userId}`
}

function emptyTitle(box: 'inbox' | 'sent' | 'drafts' | 'spam'): string {
  if (box === 'sent') return 'Nothing sent yet'
  if (box === 'drafts') return 'No drafts'
  if (box === 'spam') return 'No spam'
  return 'Inbox is empty'
}

function emptyDetail(box: 'inbox' | 'sent' | 'drafts' | 'spam'): string {
  if (box === 'sent') return 'Messages you send show up here.'
  if (box === 'drafts') return 'Save a message before sending and it will show up here.'
  if (box === 'spam') return 'Mail you mark as spam leaves the inbox and shows up here.'
  return ''
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
