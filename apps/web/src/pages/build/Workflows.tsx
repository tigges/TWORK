import React from 'react'
import { Repeat2 } from 'lucide-react'
import { StubPage } from '../../components/StubPage'
import { SubNav } from '../../components/SubNav'

const SUBNAV = [
  { label: 'Flows', path: '/build/flows' },
  { label: 'Workflows', path: '/build/workflows' },
]

export function WorkflowsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Flows</h1>
        </div>
        <SubNav items={SUBNAV} />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <StubPage title="Workflows" icon={Repeat2} action="New Workflow" />
      </div>
    </div>
  )
}
