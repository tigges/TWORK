import React from 'react'
import { Globe, Plug, Database, Repeat2 } from 'lucide-react'
import { StubPage } from '../../components/StubPage'

export function ChannelsPage() {
  return <StubPage title="Channels" description="Configure bot channels" icon={Globe} action="Add Channel" />
}

export function IntegrationsPage() {
  return <StubPage title="Integrations" description="Third-party integrations" icon={Plug} action="Browse Integrations" />
}

export function DatabasePage() {
  return <StubPage title="Database" description="Custom data tables" icon={Database} action="Create Table" />
}

export function WebhooksPage() {
  return <StubPage title="Webhooks" description="Configure outbound webhooks" icon={Repeat2} action="Add Webhook" />
}
