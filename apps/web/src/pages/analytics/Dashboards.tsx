import React from 'react'
import { LayoutDashboard, FileText } from 'lucide-react'
import { StubPage } from '../../components/StubPage'
import { SubNav } from '../../components/SubNav'

const SUBNAV = [
  { label: 'Overview', path: '/analytics' },
  { label: 'Dashboards', path: '/analytics/dashboards' },
  { label: 'Reports', path: '/analytics/reports' },
]

function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Analytics</h1>
        <SubNav items={SUBNAV} />
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function DashboardsPage() {
  return <AnalyticsLayout><StubPage title="Dashboards" icon={LayoutDashboard} action="New Dashboard" /></AnalyticsLayout>
}

export function ReportsPage() {
  return <AnalyticsLayout><StubPage title="Reports" icon={FileText} action="New Report" /></AnalyticsLayout>
}
