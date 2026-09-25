import { useRef, useState } from 'react'
import { FileText, Folder, RotateCcw, Trash2, Upload } from 'lucide-react'
import { ShareField } from '../components/ShareField.js'
import { useSidebarOpen } from '../components/Shell.js'
import { trpc } from '../trpc.js'

type BrowseRow = {
  id:          string
  name:        string
  isFolder:    boolean
  updatedAt:   Date | string
  sizeBytes:   number | null
  contentType: string | null
}

export function FilesPage() {
  const sidebarOpen = useSidebarOpen()
  const utils = trpc.useUtils()
  const [view, setView] = useState<'browse' | 'trash'>('browse')
  const [parentId, setParentId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [naming, setNaming] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const list = trpc.files.list.useQuery(
    { parentId },
    { enabled: view === 'browse' },
  )
  const trash = trpc.files.trash.useQuery(undefined, { enabled: view === 'trash' })
  const mkdir = trpc.files.mkdir.useMutation()
  const remove = trpc.files.remove.useMutation()
  const restore = trpc.files.restore.useMutation()

  const rows = list.data?.rows ?? []
  const selected = rows.find(row => row.id === selectedId) ?? null

  async function refresh() {
    await Promise.all([
      utils.files.list.invalidate(),
      utils.files.trash.invalidate(),
    ])
  }

  async function createFolder() {
    const name = folderName.trim()
    if (!name) return
    setError(null)
    try {
      await mkdir.mutateAsync({ parentId, name })
      setFolderName('')
      setNaming(false)
      await refresh()
    } catch (err) {
      setError(messageOf(err))
    }
  }

  async function upload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      if (parentId) body.append('parentId', parentId)
      const res = await fetch('/files/upload', { method: 'POST', body, credentials: 'include' })
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error || 'Upload failed.')
      }
      await refresh()
    } catch (err) {
      setError(messageOf(err))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  async function trashSelected(id: string) {
    setError(null)
    try {
      await remove.mutateAsync({ id })
      setSelectedId(null)
      await refresh()
    } catch (err) {
      setError(messageOf(err))
    }
  }

  async function restoreRow(id: string) {
    setError(null)
    try {
      await restore.mutateAsync({ id })
      await refresh()
    } catch (err) {
      setError(messageOf(err))
    }
  }

  function openFolder(id: string | null) {
    setView('browse')
    setParentId(id)
    setSelectedId(null)
    setNaming(false)
    setError(null)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className={['flex items-center justify-between gap-3 border-b border-zinc-200 py-3 dark:border-zinc-800', sidebarOpen ? 'px-5' : 'pl-14 pr-5'].join(' ')}>
        <nav className="flex min-w-0 items-center gap-1 text-sm">
          <Crumb active={view === 'browse' && !parentId} onClick={() => openFolder(null)}>Files</Crumb>
          {view === 'browse' && (list.data?.crumbs ?? []).map((crumb, index, all) => (
            <span key={crumb.id} className="flex min-w-0 items-center gap-1">
              <span className="text-zinc-300">/</span>
              <Crumb active={index === all.length - 1} onClick={() => openFolder(crumb.id)}>{crumb.name}</Crumb>
            </span>
          ))}
          {view === 'trash' && (
            <span className="flex items-center gap-1">
              <span className="text-zinc-300">/</span>
              <span className="font-medium">Trash</span>
            </span>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => { setView(view === 'trash' ? 'browse' : 'trash'); setSelectedId(null); setError(null) }}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Trash2 size={14} />
            {view === 'trash' ? 'Back' : 'Trash'}
          </button>
          {view === 'browse' && (
            <>
              <button
                type="button"
                onClick={() => { setNaming(true); setFolderName(''); setError(null) }}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                New folder
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                <Upload size={14} />
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={event => {
                  const file = event.target.files?.[0]
                  if (file) void upload(file)
                }}
              />
            </>
          )}
        </div>
      </header>

      {error && (
        <p className="border-b border-red-200 bg-red-50 px-5 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          {view === 'trash'
            ? <TrashList rows={trash.data ?? []} loading={trash.isLoading} onRestore={id => void restoreRow(id)} />
            : (
              <BrowseList
                rows={rows}
                loading={list.isLoading}
                selectedId={selected?.id ?? null}
                naming={naming}
                folderName={folderName}
                saving={mkdir.isPending}
                onFolderName={setFolderName}
                onCreate={() => void createFolder()}
                onCancelName={() => { setNaming(false); setFolderName('') }}
                onOpen={row => {
                  if (row.isFolder) openFolder(row.id)
                  else setSelectedId(row.id)
                }}
              />
            )}
        </div>
        {view === 'browse' && selected && (
          <Preview
            row={selected}
            onOpen={() => selected.isFolder && openFolder(selected.id)}
            onTrash={() => void trashSelected(selected.id)}
          />
        )}
      </div>
    </div>
  )
}

function Crumb({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={['truncate', active ? 'font-medium' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'].join(' ')}
    >
      {children}
    </button>
  )
}

function BrowseList({
  rows, loading, selectedId, naming, folderName, saving,
  onFolderName, onCreate, onCancelName, onOpen,
}: {
  rows:         BrowseRow[]
  loading:      boolean
  selectedId:   string | null
  naming:       boolean
  folderName:   string
  saving:       boolean
  onFolderName: (value: string) => void
  onCreate:     () => void
  onCancelName: () => void
  onOpen:       (row: BrowseRow) => void
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="sticky top-0 bg-white text-xs text-zinc-500 dark:bg-zinc-900">
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className="px-5 py-2 font-medium">Name</th>
          <th className="w-40 px-3 py-2 font-medium">Modified</th>
          <th className="w-24 px-3 py-2 font-medium">Size</th>
        </tr>
      </thead>
      <tbody>
        {naming && (
          <tr className="border-b border-zinc-100 dark:border-zinc-800">
            <td className="px-5 py-2" colSpan={3}>
              <form
                className="flex items-center gap-2"
                onSubmit={event => { event.preventDefault(); onCreate() }}
              >
                <Folder size={16} className="shrink-0 text-indigo-600" />
                <input
                  autoFocus
                  value={folderName}
                  onChange={event => onFolderName(event.target.value)}
                  placeholder="Folder name"
                  className="w-64 rounded-md border border-zinc-200 bg-transparent px-2 py-1 text-sm outline-none focus:border-indigo-500 dark:border-zinc-700"
                />
                <button type="submit" disabled={saving} className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60">
                  Create
                </button>
                <button type="button" onClick={onCancelName} className="text-xs text-zinc-500">Cancel</button>
              </form>
            </td>
          </tr>
        )}
        {loading && (
          <tr><td className="px-5 py-6 text-zinc-500" colSpan={3}>Loading…</td></tr>
        )}
        {!loading && rows.length === 0 && !naming && (
          <tr><td className="px-5 py-16 text-center text-zinc-500" colSpan={3}>This folder is empty.</td></tr>
        )}
        {rows.map(row => (
          <tr
            key={row.id}
            onClick={() => onOpen(row)}
            className={[
              'cursor-pointer border-b border-zinc-100 dark:border-zinc-800',
              row.id === selectedId ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60',
            ].join(' ')}
          >
            <td className="px-5 py-2.5">
              <span className="flex items-center gap-2">
                {row.isFolder
                  ? <Folder size={16} className="shrink-0 text-indigo-600" />
                  : <FileText size={16} className="shrink-0 text-zinc-400" />}
                <span className="truncate">{row.name}</span>
              </span>
            </td>
            <td className="px-3 py-2.5 text-xs text-zinc-500">{formatWhen(row.updatedAt)}</td>
            <td className="px-3 py-2.5 text-xs text-zinc-500">{row.isFolder ? '—' : formatSize(row.sizeBytes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Preview({ row, onOpen, onTrash }: { row: BrowseRow; onOpen: () => void; onTrash: () => void }) {
  const type = row.contentType ?? ''
  const href = `/files/download/${row.id}`
  const image = type.startsWith('image/')
  const pdf = type === 'application/pdf'
  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-zinc-200 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{row.name}</h2>
          <p className="text-xs text-zinc-500">
            {row.isFolder ? 'Folder' : formatSize(row.sizeBytes)}
            {' · '}
            {formatWhen(row.updatedAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ShareField type="file" id={row.id} />
          <button
            type="button"
            onClick={onTrash}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Trash2 size={12} />
            Trash
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {row.isFolder && (
          <button type="button" onClick={onOpen} className="text-sm font-medium text-indigo-600">Open folder</button>
        )}
        {image && <img src={href} alt={row.name} className="max-w-full rounded-md" />}
        {pdf && <iframe title={row.name} src={href} className="h-[70vh] w-full rounded-md border border-zinc-200 dark:border-zinc-700" />}
        {!row.isFolder && !image && !pdf && (
          <a href={href} className="text-sm font-medium text-indigo-600">Download</a>
        )}
      </div>
    </aside>
  )
}

function TrashList({
  rows, loading, onRestore,
}: {
  rows:      { id: string; name: string; isFolder: boolean; updatedAt: Date | string }[]
  loading:   boolean
  onRestore: (id: string) => void
}) {
  if (loading) return <p className="px-5 py-6 text-sm text-zinc-500">Loading…</p>
  if (rows.length === 0) return <p className="px-5 py-16 text-center text-sm text-zinc-500">Trash is empty.</p>
  return (
    <ul>
      {rows.map(row => (
        <li key={row.id} className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-2.5 dark:border-zinc-800">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            {row.isFolder ? <Folder size={16} className="shrink-0 text-zinc-400" /> : <FileText size={16} className="shrink-0 text-zinc-400" />}
            <span className="truncate">{row.name}</span>
          </span>
          <button
            type="button"
            onClick={() => onRestore(row.id)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <RotateCcw size={12} />
            Restore
          </button>
        </li>
      ))}
    </ul>
  )
}

function formatWhen(value: Date | string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatSize(bytes: number | null) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function messageOf(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong.'
}
