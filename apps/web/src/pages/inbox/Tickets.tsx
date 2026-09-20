import React from 'react'
import { Ticket } from 'lucide-react'
import { StubPage } from '../../components/StubPage'
import { SubNav } from '../../components/SubNav'

const SUBNAV = [
  { label: 'Chats', path: '/inbox/chats' },
  { label: 'Tickets', path: '/inbox/tickets' },
  { label: 'Contacts', path: '/inbox/contacts' },
  { label: 'Settings', path: '/inbox/settings' },
]

function InboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)] pb-0">Inbox</h1>
        <SubNav items={SUBNAV} />
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}

export function TicketsPage() {
  return <InboxLayout><StubPage title="Tickets" action="New Ticket" /></InboxLayout>
}
