import React from 'react'
import { Users, FileText } from 'lucide-react'
import { StubPage } from '../../components/StubPage'

export function TeamPage() {
  return <StubPage title="Team" description="Manage workspace members and roles" icon={Users} action="Invite Member" />
}

export function AuditPage() {
  return <StubPage title="Audit Log" description="Track all workspace activity" icon={FileText} />
}
