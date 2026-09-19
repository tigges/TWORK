import React from 'react'
import { Megaphone } from 'lucide-react'
import { StubPage } from '../../components/StubPage'
import { SubNav } from '../../components/SubNav'

const SUBNAV = [
  { label: 'Campaigns', path: '/engage/campaigns' },
  { label: 'Templates', path: '/engage/templates' },
]

function EngageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Engage</h1>
        <SubNav items={SUBNAV} />
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function CampaignsPage() {
  return <EngageLayout><StubPage title="Campaigns" icon={Megaphone} action="New Campaign" /></EngageLayout>
}
