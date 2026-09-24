import { Calendar } from 'lucide-react'
import { ModulePlaceholder } from '../components/ModulePlaceholder.js'

export function SchedulePage() {
  return (
    <ModulePlaceholder
      icon={<Calendar size={40} />}
      name="Schedule"
      description="Events with UTC instants, originating timezones, and verbatim RRULE strings. Coming next."
    />
  )
}
