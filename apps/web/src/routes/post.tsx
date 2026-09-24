import { Mail } from 'lucide-react'
import { ModulePlaceholder } from '../components/ModulePlaceholder.js'

export function PostPage() {
  return (
    <ModulePlaceholder
      icon={<Mail size={40} />}
      name="Post"
      description="Inbound and outbound messages with full RFC 5322 storage. Coming next."
    />
  )
}
