import { Calendar, FileText, Folder, Mail, MessageSquare, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { normalizeNav } from './nav-order.js'

export interface NavItem {
  id:    string
  to:    string
  label: string
  icon:  LucideIcon
}

export const NAV: readonly NavItem[] = [
  { id: 'mail', to: '/mail', label: 'Mail', icon: Mail },
  { id: 'contacts', to: '/contacts', label: 'Contacts', icon: Users },
  { id: 'files', to: '/files', label: 'Files', icon: Folder },
  { id: 'notes', to: '/notes', label: 'Notes', icon: FileText },
  { id: 'calendar', to: '/calendar', label: 'Calendar', icon: Calendar },
  { id: 'chat', to: '/chat', label: 'Chat', icon: MessageSquare },
]

export const NAV_IDS = NAV.map(item => item.id)

export function orderedNav(ids: readonly string[]): NavItem[] {
  const byId = new Map(NAV.map(item => [item.id, item]))
  return normalizeNav([...ids], NAV_IDS).map(id => byId.get(id)!)
}
