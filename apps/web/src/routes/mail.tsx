import { Mail } from 'lucide-react'
import { ModulePlaceholder } from '../components/ModulePlaceholder.js'

export function MailPage() {
  return (
    <ModulePlaceholder
      icon={<Mail size={40} />}
      name="Mail"
      description="Inbound and outbound messages with full RFC 5322 storage. Coming next."
    />
  )
}
