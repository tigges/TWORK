import React, { useState } from 'react'
import { Workflow, Plus, Search, MoreVertical, Play, Copy, Trash2 } from 'lucide-react'
import { Button, Input, Badge, Table, THead, TBody, TR, TH, TD, EmptyState, PageHeader } from '@ybot/ui'
import { SubNav } from '../../components/SubNav'
import { useNavigate } from '@tanstack/react-router'

const SUBNAV = [
  { label: 'Flows', path: '/build/flows' },
  { label: 'Workflows', path: '/build/workflows' },
]

const MOCK_FLOWS = [
  { id: '1', name: 'Welcome Flow', kind: 'flow', status: 'published', nodes: 8, updatedAt: '2h ago' },
  { id: '2', name: 'Product FAQ', kind: 'flow', status: 'published', nodes: 14, updatedAt: '1d ago' },
  { id: '3', name: 'Order Support', kind: 'flow', status: 'draft', nodes: 6, updatedAt: '3d ago' },
  { id: '4', name: 'Lead Qualification', kind: 'flow', status: 'draft', nodes: 11, updatedAt: '5d ago' },
]

export function FlowsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const filtered = MOCK_FLOWS.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Flows"
        description="Visual conversation flow builder"
        actions={
          <Button size="md">
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

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Workflow size={20} />}
            title="No flows found"
            description="Create your first flow to start building conversations."
            action={<Button size="md"><Plus size={14} /> New Flow</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Status</TH>
                <TH>Nodes</TH>
                <TH>Updated</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {filtered.map((flow) => (
                <TR key={flow.id} onClick={() => navigate({ to: '/build/flows/$flowId', params: { flowId: flow.id } })}>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Workflow size={14} className="text-[var(--text-muted)]" />
                      <span className="font-medium">{flow.name}</span>
                    </div>
                  </TD>
                  <TD>
                    <Badge variant={flow.status === 'published' ? 'success' : 'muted'} dot>
                      {flow.status}
                    </Badge>
                  </TD>
                  <TD>{flow.nodes} nodes</TD>
                  <TD className="text-[var(--text-muted)]">{flow.updatedAt}</TD>
                  <TD>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon-sm"><Play size={12} /></Button>
                      <Button variant="ghost" size="icon-sm"><Copy size={12} /></Button>
                      <Button variant="ghost" size="icon-sm"><Trash2 size={12} /></Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </div>
  )
}
