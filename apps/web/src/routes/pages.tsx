import { FileText } from 'lucide-react'
import { ModulePlaceholder } from '../components/ModulePlaceholder.js'

export function PagesPage() {
  return (
    <ModulePlaceholder
      icon={<FileText size={40} />}
      name="Pages"
      description="Collaborative documents with autosave, revisions, and a rich editor. Coming next."
    />
  )
}
