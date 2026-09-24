import { MessageSquare } from 'lucide-react'
import { ModulePlaceholder } from '../components/ModulePlaceholder.js'

export function RoomsPage() {
  return (
    <ModulePlaceholder
      icon={<MessageSquare size={40} />}
      name="Rooms"
      description="Real-time chat over WebSocket with channels, DMs, and thread replies. Coming next."
    />
  )
}
