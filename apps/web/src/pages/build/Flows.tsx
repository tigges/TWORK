import React, { useState } from 'react'
import { Workflow, Plus, Search, MoreVertical, Play, Copy, Trash2 } from 'lucide-react'
import { Button, Input, Badge, Table, THead, TBody, TR, TH, TD, EmptyState, PageHeader, Skeleton, Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { useNavigate } from '@tanstack/react-router'
import { useFlows, useCreateFlow, useDeleteFlow } from '../../lib/hooks'

const SUBNAV = [
  { label: 'Flows', path: '/build/flows' },
  { label: 'Workflows', path: '/build/workflows' },
]

export function FlowsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const { data: flows = [], isLoading } = useFlows()
  const createFlow = useCreateFlow()
  const deleteFlow = useDeleteFlow()

  const filtered = flows.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))

  function relativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60_000)
    if (m < 2) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  async function handleCreate() {
    if (!newName.trim()) return
    const flow = await createFlow.mutateAsync({ name: newName.trim(), description: newDesc.trim() || undefined })
    setShowNew(false); setNewName(''); setNewDesc('')
    navigate({ to: '/build/flows/$flowId', params: { flowId: flow.id } })
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Flows"
        description="Visual conversation flow builder"
        actions={
          <Button size="md" onClick={() => setShowNew(true)}>
            <Plus size={14} /> New Flow
          </Button>
        }
        tabs={<SubNav items={SUBNAV} />}
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1 max-w-xs">
            <Input
              placeholder="Search flows…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftIcon={<Search size={14} />}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-[var(--radius-md)]" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Workflow size={20} />}
            title="No flows yet"
            description="Create your first flow to start building conversations."
            action={<Button size="md" onClick={() => setShowNew(true)}><Plus size={14} /> New Flow</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Version</TH>
                <TH>Updated</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {filtered.map((flow) => {
                const latest = flow.versions?.[0]
                return (
                  <TR key={flow.id} onClick={() => navigate({ to: '/build/flows/$flowId', params: { flowId: flow.id } })}>
                    <TD>
                      <div className="flex items-center gap-2">
                        <Workflow size={14} className="text-[var(--text-muted)]" />
                        <div>
                          <span className="font-medium">{flow.name}</span>
                          {flow.description && <p className="text-xs text-[var(--text-muted)]">{flow.description}</p>}
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={latest?.status === 'published' ? 'success' : 'muted'} dot>
                        {latest?.status ?? 'draft'}
                      </Badge>
                    </TD>
                    <TD className="text-[var(--text-muted)]">v{latest?.version ?? 1}</TD>
                    <TD className="text-[var(--text-muted)]">{relativeTime(flow.updatedAt)}</TD>
                    <TD>
                      <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon-sm" title="Open canvas"><Play size={12} /></Button>
                        <Button variant="ghost" size="icon-sm" title="Delete" onClick={() => deleteFlow.mutate(flow.id)}><Trash2 size={12} /></Button>
                      </div>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </div>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent size="sm">
          <DialogHeader><DialogTitle>New flow</DialogTitle></DialogHeader>
          <DialogBody className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Name *</label>
              <Input autoFocus placeholder="e.g. Welcome & Routing" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-muted)] mb-1.5 block">Description</label>
              <Input placeholder="What does this flow do?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || createFlow.isPending} onClick={handleCreate}>
              {createFlow.isPending ? 'Creating…' : 'Create flow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
