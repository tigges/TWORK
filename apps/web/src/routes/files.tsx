import { Folder } from 'lucide-react'
import { ModulePlaceholder } from '../components/ModulePlaceholder.js'

export function FilesPage() {
  return (
    <ModulePlaceholder
      icon={<Folder size={40} />}
      name="Files"
      description="Content-addressed file storage with folder hierarchy and trash. Coming next."
    />
  )
}
