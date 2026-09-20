import React, { useState } from 'react'
import {
  BookOpen, Plus, Globe, FileText, Link2, RefreshCw,
  CheckCircle, AlertCircle, Clock, Trash2
} from 'lucide-react'
import { Button, Badge, EmptyState, Card } from '@ybot/ui'
import { SubNav } from '../../../components/SubNav'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
  Input,
} from '@ybot/ui'
import { cn } from '@ybot/ui'

const SUBNAV = [
  { label: 'Intents', path: '/build/knowledge/intents' },
  { label: 'Entities', path: '/build/knowledge/entities' },
  { label: 'FAQs', path: '/build/knowledge/faqs' },
  { label: 'Sources', path: '/build/knowledge/sources' },
  { label: 'Training', path: '/build/knowledge/training' },
]

interface Source {
  id: string
  name: string
  kind: 'website' | 'url' | 'file'
  status: 'indexed' | 'processing' | 'failed'
  chunks: number
  lastSync: string
  url?: string
}

const MOCK_SOURCES: Source[] = [
  { id: '1', name: 'Product Documentation', kind: 'website', status: 'indexed', chunks: 284, lastSync: '2h ago', url: 'https://docs.acme.com' },
  { id: '2', name: 'FAQ PDF', kind: 'file', status: 'indexed', chunks: 42, lastSync: '1d ago' },
  { id: '3', name: 'Return Policy', kind: 'url', status: 'indexed', chunks: 8, lastSync: '3d ago', url: 'https://acme.com/returns' },
  { id: '4', name: 'Shipping Guide', kind: 'url', status: 'processing', chunks: 0, lastSync: 'syncing…', url: 'https://acme.com/shipping' },
  { id: '5', name: 'Old Manual', kind: 'file', status: 'failed', chunks: 0, lastSync: 'failed' },
]

const KIND_ICON: Record<Source['kind'], React.ElementType> = {
  website: Globe,
  url: Link2,
  file: FileText,
}

const STATUS_VARIANT: Record<Source['status'], 'success' | 'warning' | 'error'> = {
  indexed: 'success',
  processing: 'warning',
  failed: 'error',
}

const STATUS_ICON: Record<Source['status'], React.ElementType> = {
  indexed: CheckCircle,
  processing: Clock,
  failed: AlertCircle,
}

export function SourcesPage() {
  const [sources, setSources] = useState(MOCK_SOURCES)
  const [showAdd, setShowAdd] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState<Source['kind']>('url')

  function addSource() {
    if (!newName.trim()) return
    setSources((s) => [
      {
        id: `src-${Date.now()}`,
        name: newName,
        kind: newKind,
        status: 'processing',
        chunks: 0,
        lastSync: 'syncing…',
        url: newUrl || undefined,
      },
      ...s,
    ])
    setShowAdd(false)
    setNewUrl('')
    setNewName('')
  }

  function deleteSource(id: string) {
    setSources((s) => s.filter((src) => src.id !== id))
  }

  function resync(id: string) {
    setSources((s) =>
      s.map((src) => src.id === id ? { ...src, status: 'processing', lastSync: 'syncing…' } : src)
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between px-6 pt-4 pb-0">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">Knowledge</h1>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={13} /> Add Source
          </Button>
        </div>
        <SubNav items={SUBNAV} />
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <p className="text-xs text-[var(--text-muted)]">Total Sources</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{sources.length}</p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--text-muted)]">Total Chunks</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
              {sources.reduce((sum, s) => sum + s.chunks, 0)}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-[var(--text-muted)]">Indexed</p>
            <p className="text-2xl font-bold text-[var(--success)] mt-1">
              {sources.filter((s) => s.status === 'indexed').length}
            </p>
          </Card>
        </div>

        {/* Sources list */}
        <div className="space-y-2">
          {sources.map((src) => {
            const KindIcon = KIND_ICON[src.kind]
            const StatusIcon = STATUS_ICON[src.status]
            return (
              <div
                key={src.id}
                className="flex items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--bg-overlay)]">
                  <KindIcon size={16} className="text-[var(--text-muted)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)] text-sm truncate">{src.name}</p>
                    <Badge variant={STATUS_VARIANT[src.status]} dot>{src.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {src.url && <span className="text-xs text-[var(--text-muted)] truncate max-w-[200px]">{src.url}</span>}
                    {src.chunks > 0 && <span className="text-xs text-[var(--text-muted)]">{src.chunks} chunks</span>}
                    <span className="text-xs text-[var(--text-muted)]">Last sync: {src.lastSync}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => resync(src.id)}
                    title="Re-sync"
                    disabled={src.status === 'processing'}
                  >
                    <RefreshCw size={13} className={cn(src.status === 'processing' && 'animate-spin')} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => deleteSource(src.id)} title="Delete">
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Source Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Knowledge Source</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)]">Source type</label>
                <div className="mt-1 flex gap-2">
                  {(['url', 'website', 'file'] as const).map((k) => {
                    const Icon = KIND_ICON[k]
                    return (
                      <button
                        key={k}
                        onClick={() => setNewKind(k)}
                        className={cn(
                          'flex flex-1 flex-col items-center gap-1 rounded-[var(--radius)] border p-3 text-xs transition-colors',
                          newKind === k
                            ? 'border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
                        )}
                      >
                        <Icon size={18} />
                        {k.charAt(0).toUpperCase() + k.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>
              <Input label="Name" placeholder="Product Documentation" value={newName} onChange={(e) => setNewName(e.target.value)} />
              {newKind !== 'file' && (
                <Input label="URL" placeholder="https://docs.example.com" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              )}
              {newKind === 'file' && (
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Upload file</label>
                  <div className="mt-1 flex items-center justify-center rounded border-2 border-dashed border-[var(--border)] p-8 hover:border-[var(--accent)]/50 hover:bg-[var(--accent-muted)] transition-colors cursor-pointer">
                    <div className="text-center">
                      <FileText size={24} className="mx-auto mb-2 text-[var(--text-muted)]" />
                      <p className="text-sm text-[var(--text-muted)]">Drop PDF, DOCX, or TXT here</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">or click to browse</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={addSource} disabled={!newName.trim()}>Add Source</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
