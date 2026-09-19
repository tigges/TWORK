import React from 'react'
import { FileText } from 'lucide-react'
import { StubPage } from '../../components/StubPage'
import { SubNav } from '../../components/SubNav'

const SUBNAV = [
  { label: 'Campaigns', path: '/engage/campaigns' },
  { label: 'Templates', path: '/engage/templates' },
]

export function TemplatesPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Engage</h1>
        <SubNav items={SUBNAV} />
      </div>
      <div className="flex-1 overflow-auto">
        <StubPage title="Templates" icon={FileText} action="New Template" />
      </div>
    </div>
  )
}
