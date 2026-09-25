import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useSidebarOpen } from '../components/Shell.js'
import { trpc } from '../trpc.js'

type BlockType = 'text' | 'heading' | 'list'

interface Block {
  type: BlockType
  text: string
}

export function NotesPage() {
  const sidebarOpen = useSidebarOpen()
  const utils = trpc.useUtils()
  const list = trpc.notes.list.useQuery()
  const create = trpc.notes.create.useMutation({
    onSuccess: async (created) => {
      setSelectedId(created.id)
      await utils.notes.list.invalidate()
    },
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = list.data?.find(row => row.id === selectedId) ?? list.data?.[0] ?? null

  return (
    <div className="flex h-full min-h-0">
      <section className="flex w-[280px] shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <header className={['flex items-center justify-between gap-3 border-b border-zinc-200 py-3 dark:border-zinc-800', sidebarOpen ? 'px-4' : 'pl-14 pr-4'].join(' ')}>
          <h1 className="text-sm font-semibold">Notes</h1>
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => create.mutate()}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            <Plus size={14} />
            New
          </button>
        </header>
        <div className="flex-1 overflow-auto">
          {list.isLoading && <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>}
          {!list.isLoading && (list.data?.length ?? 0) === 0 && (
            <p className="px-6 py-16 text-center text-sm text-zinc-500">No notes yet.</p>
          )}
          {list.data?.map(row => (
            <button
              key={row.id}
              type="button"
              onClick={() => setSelectedId(row.id)}
              className={[
                'block w-full border-b border-zinc-100 px-4 py-3 text-left dark:border-zinc-800',
                row.id === selected?.id ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
              ].join(' ')}
            >
              <span className="block truncate text-sm font-medium">{row.title || 'Untitled'}</span>
              <time className="text-[11px] text-zinc-400">{new Date(row.updatedAt).toLocaleString()}</time>
            </button>
          ))}
        </div>
      </section>
      <section className="min-w-0 flex-1">
        {selected ? <NoteEditor key={selected.id} id={selected.id} /> : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">Select a note</div>
        )}
      </section>
    </div>
  )
}

function NoteEditor({ id }: { id: string }) {
  const utils = trpc.useUtils()
  const note = trpc.notes.get.useQuery({ id })
  const save = trpc.notes.save.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.notes.get.invalidate({ id }),
        utils.notes.list.invalidate(),
      ])
    },
  })
  const restore = trpc.notes.restore.useMutation({
    onSuccess: async () => { await utils.notes.get.invalidate({ id }) },
  })
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([{ type: 'text', text: '' }])
  const [loaded, setLoaded] = useState<string | null>(null)
  const [revisionsOpen, setRevisionsOpen] = useState(false)

  useEffect(() => {
    if (!note.data || loaded === (note.data.revisionId ?? 'new')) return
    setTitle(note.data.title)
    setBlocks(note.data.blocks.length > 0 ? note.data.blocks : [{ type: 'text', text: '' }])
    setLoaded(note.data.revisionId ?? 'new')
  }, [note.data, loaded])

  if (note.isLoading) return <p className="p-8 text-sm text-zinc-500">Loading…</p>
  if (!note.data) return <p className="p-8 text-sm text-zinc-500">Note not found.</p>

  function update(index: number, next: Partial<Block>) {
    setBlocks(current => current.map((block, i) => i === index ? { ...block, ...next } : block))
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-8 py-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setRevisionsOpen(open => !open)}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Revisions
        </button>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate({ id, title, blocks })}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </header>
      {revisionsOpen && (
        <div className="max-h-40 overflow-auto border-b border-zinc-200 px-8 py-3 dark:border-zinc-800">
          {(note.data.revisions.length ?? 0) === 0 && <p className="text-xs text-zinc-500">No revisions yet. Save the note to keep one.</p>}
          <ul className="space-y-1">
            {note.data.revisions.map(revision => (
              <li key={revision.id} className="flex items-center justify-between gap-3 text-xs">
                <time className="text-zinc-500">{new Date(revision.createdAt).toLocaleString()}</time>
                <button
                  type="button"
                  disabled={restore.isPending || revision.id === note.data?.revisionId}
                  onClick={() => restore.mutate({ id, revisionId: revision.id })}
                  className="font-medium text-indigo-600 hover:text-indigo-500 disabled:text-zinc-400"
                >
                  {revision.id === note.data?.revisionId ? 'Current' : 'Restore'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto px-8 py-8">
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Untitled"
          aria-label="Title"
          className="mb-8 w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-zinc-300"
        />
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <div key={index} className="group">
              <div className="mb-1 flex gap-2 text-[11px] text-zinc-400">
                {(['text', 'heading', 'list'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update(index, { type })}
                    className={block.type === type ? 'font-medium text-indigo-600' : 'hover:text-zinc-700 dark:hover:text-zinc-200'}
                  >
                    {type === 'text' ? 'Text' : type === 'heading' ? 'Heading' : 'List'}
                  </button>
                ))}
              </div>
              <textarea
                value={block.text}
                onChange={event => update(index, { text: event.target.value })}
                rows={block.type === 'heading' ? 1 : 3}
                placeholder={block.type === 'list' ? 'One item on each line' : ''}
                aria-label={block.type}
                className={[
                  'w-full resize-none bg-transparent outline-none placeholder:text-zinc-300',
                  block.type === 'heading' ? 'text-lg font-semibold' : 'text-sm leading-6',
                  block.type === 'list' ? 'border-l-2 border-zinc-200 pl-3 dark:border-zinc-700' : '',
                ].join(' ')}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setBlocks(current => [...current, { type: 'text', text: '' }])}
          className="mt-6 text-xs font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Add block
        </button>
        {(save.error || restore.error) && (
          <p className="mt-4 text-xs text-red-600">{save.error?.message || restore.error?.message}</p>
        )}
      </div>
    </div>
  )
}
