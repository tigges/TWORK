import { Calendar } from 'lucide-react'
import { ModulePlaceholder } from '../components/ModulePlaceholder.js'

export function CalendarPage() {
  return (
    <ModulePlaceholder
      icon={<Calendar size={40} />}
      name="Calendar"
      description="Events with UTC instants, originating timezones, and verbatim RRULE strings. Coming next."
    />
  )
}
