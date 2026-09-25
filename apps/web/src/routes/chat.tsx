import { useEffect, useRef, useState } from 'react'
import { trpc } from '../trpc.js'
import { useSidebarOpen } from '../components/Shell.js'

export function ChatPage() {
  const sidebarOpen = useSidebarOpen()
  const utils = trpc.useUtils()
  const list = trpc.chat.list.useQuery()
  const ensure = trpc.chat.ensureDirect.useMutation({
    onSuccess: async () => { await utils.chat.list.invalidate() },
  })
  const create = trpc.chat.createRoom.useMutation({
    onSuccess: async (created) => {
      setNaming(false)
      setName('')
      setSelectedId(created.id)
      setThreadId(null)
      await utils.chat.list.invalidate()
    },
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [threadId, setThreadId] = useState<string | null>(null)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const ensured = useRef(false)

  useEffect(() => {
    if (!list.data || list.data.some(row => row.isDm) || ensured.current) return
    ensured.current = true
    ensure.mutate()
  }, [list.data, ensure])

  const rooms = [...(list.data ?? [])].sort((a, b) => Number(b.isDm) - Number(a.isDm))
  const selected = rooms.find(row => row.id === selectedId) ?? rooms[0] ?? null

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[240px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <header className={['flex items-center justify-between gap-3 border-b border-zinc-200 py-3 dark:border-zinc-800', sidebarOpen ? 'px-4' : 'pl-14 pr-4'].join(' ')}>
          <h1 className="text-sm font-semibold">Chat</h1>
          <button
            type="button"
            onClick={() => setNaming(open => !open)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-500"
          >
            New room
          </button>
        </header>
        {naming && (
          <form
            className="flex gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800"
            onSubmit={event => {
              event.preventDefault()
              const trimmed = name.trim()
              if (!trimmed) return
              create.mutate({ name: trimmed })
            }}
          >
            <input
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Room name"
              aria-label="Room name"
              maxLength={80}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <button type="submit" disabled={create.isPending} className="text-xs font-medium text-indigo-600 disabled:opacity-60">
              Add
            </button>
          </form>
        )}
        <div className="flex-1 overflow-auto">
          {rooms.map(row => (
            <button
              key={row.id}
              type="button"
              onClick={() => { setSelectedId(row.id); setThreadId(null) }}
              className={[
                'block w-full px-4 py-2.5 text-left text-sm',
                row.id === selected?.id ? 'bg-indigo-50 font-medium dark:bg-indigo-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
              ].join(' ')}
            >
              {row.isDm ? 'Direct' : row.name}
            </button>
          ))}
        </div>
        {create.error && <p className="px-4 py-2 text-xs text-red-600">{create.error.message}</p>}
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        {selected ? (
          <Thread
            channelId={selected.id}
            title={selected.isDm ? 'Direct' : selected.name}
            parentId={null}
            onOpen={setThreadId}
            activeId={threadId}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">No rooms yet</div>
        )}
      </section>

      {selected && threadId && (
        <section className="flex w-[320px] shrink-0 flex-col border-l border-zinc-200 dark:border-zinc-800">
          <Thread
            channelId={selected.id}
            title="Replies"
            parentId={threadId}
            onOpen={() => {}}
            activeId={null}
            onClose={() => setThreadId(null)}
          />
        </section>
      )}
    </div>
  )
}

function Thread({
  channelId,
  title,
  parentId,
  onOpen,
  activeId,
  onClose,
}: {
  channelId: string
  title: string
  parentId: string | null
  onOpen: (id: string) => void
  activeId: string | null
  onClose?: () => void
}) {
  const utils = trpc.useUtils()
  const messages = trpc.chat.messages.useQuery({ channelId, parentId })
  const send = trpc.chat.send.useMutation({
    onSuccess: async () => {
      setBody('')
      await utils.chat.messages.invalidate({ channelId, parentId })
    },
  })
  const [body, setBody] = useState('')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="text-xs text-zinc-400 hover:text-zinc-700">Close</button>
        )}
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4">
        {messages.isLoading && <p className="text-sm text-zinc-500">Loading…</p>}
        {!messages.isLoading && (messages.data?.length ?? 0) === 0 && (
          <p className="text-sm text-zinc-400">{parentId ? 'No replies yet.' : 'No messages yet.'}</p>
        )}
        {messages.data?.map(row => (
          <article key={row.id} className={row.id === activeId ? 'rounded-md bg-indigo-50 px-2 py-1 dark:bg-indigo-950/40' : ''}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-medium">{row.author}</span>
              <time className="text-[11px] text-zinc-400">{new Date(row.createdAt).toLocaleString()}</time>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6">{row.body}</p>
            {!parentId && (
              <button
                type="button"
                onClick={() => onOpen(row.id)}
                className="mt-1 text-[11px] font-medium text-zinc-400 hover:text-indigo-600"
              >
                Reply
              </button>
            )}
          </article>
        ))}
      </div>
      <form
        className="flex gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
        onSubmit={event => {
          event.preventDefault()
          const text = body.trim()
          if (!text) return
          send.mutate({ channelId, parentId, body: text })
        }}
      >
        <input
          value={body}
          onChange={event => setBody(event.target.value)}
          placeholder={parentId ? 'Write a reply' : 'Write a message'}
          aria-label={parentId ? 'Reply' : 'Message'}
          maxLength={4000}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          disabled={send.isPending || body.trim().length === 0}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {send.error && <p className="px-4 pb-2 text-xs text-red-600">{send.error.message}</p>}
    </div>
  )
}
