import React from 'react'
import { Settings } from 'lucide-react'
import { StubPage } from '../../components/StubPage'
import { SubNav } from '../../components/SubNav'

const SUBNAV = [
  { label: 'Chats', path: '/inbox/chats' },
  { label: 'Tickets', path: '/inbox/tickets' },
  { label: 'Contacts', path: '/inbox/contacts' },
  { label: 'Settings', path: '/inbox/settings' },
]

export function InboxSettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 pt-4 pb-0 shrink-0">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">Inbox</h1>
        <SubNav items={SUBNAV} />
      </div>
      <div className="flex-1 overflow-auto">
        <StubPage title="Inbox Settings" icon={Settings} />
      </div>
    </div>
  )
}
