import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import { trpc } from '../trpc.js'

type Occurrence = {
  eventId:            string
  occurrenceStartUtc: string
  title:              string
  allDay:             boolean
  startUtc:           string
  endUtc:             string
  startTz:            string
  endTz:              string
  rrule:              string | null
}

type Series = {
  id:          string
  title:       string
  description: string | null
  allDay:      boolean
  startLocal:  string
  endLocal:    string
  timeZone:    string
  rrule:       string | null
}

type Panel =
  | { mode: 'create'; date: string }
  | { mode: 'edit'; eventId: string; occurrenceStartUtc: string }

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const PRESETS = [
  { id: 'none',    label: 'Does not repeat', rrule: '' },
  { id: 'daily',   label: 'Daily',            rrule: 'FREQ=DAILY' },
  { id: 'weekly',  label: 'Weekly',           rrule: 'FREQ=WEEKLY' },
  { id: 'monthly', label: 'Monthly',          rrule: 'FREQ=MONTHLY' },
  { id: 'yearly',  label: 'Yearly',           rrule: 'FREQ=YEARLY' },
  { id: 'custom',  label: 'Custom rule',      rrule: '' },
] as const

export function CalendarPage() {
  const browserZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [panel, setPanel] = useState<Panel | null>(null)
  const grid = useMemo(() => monthGrid(cursor), [cursor])
  const from = grid[0] ? startOfDay(grid[0]).toISOString() : new Date().toISOString()
  const last = grid[grid.length - 1]
  const to = last ? new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1).toISOString() : from
  const events = trpc.calendar.list.useQuery({ from, to })

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    for (const row of events.data ?? []) {
      for (const key of occurrenceKeys(row)) {
        const list = map.get(key) ?? []
        list.push(row)
        map.set(key, list)
      }
    }
    return map
  }, [events.data])

  const todayKey = dateKey(new Date())

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h1 className="min-w-40 text-sm font-semibold">
            {cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
          </h1>
          <button type="button" onClick={() => setCursor(addMonths(cursor, -1))} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={() => setCursor(addMonths(cursor, 1))} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Next month">
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date()
              setCursor(new Date(now.getFullYear(), now.getMonth(), 1))
            }}
            className="rounded-md px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Today
          </button>
        </div>
        <button
          type="button"
          onClick={() => setPanel({ mode: 'create', date: todayKey })}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <Plus size={14} />
          New event
        </button>
      </header>

      <div className="grid grid-cols-7 border-b border-zinc-200 px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800">
        {WEEKDAYS.map(day => <div key={day} className="px-2">{day}</div>)}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {grid.map(day => {
          const key = dateKey(day)
          const inMonth = day.getMonth() === cursor.getMonth()
          const rows = byDay.get(key) ?? []
          return (
            <div
              key={key}
              className={[
                'flex min-h-0 flex-col border-b border-r border-zinc-100 p-1 dark:border-zinc-800',
                inMonth ? '' : 'bg-zinc-50/70 dark:bg-zinc-950/40',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => setPanel({ mode: 'create', date: key })}
                className={[
                  'mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                  key === todayKey
                    ? 'bg-indigo-600 font-semibold text-white'
                    : inMonth ? 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800' : 'text-zinc-400',
                ].join(' ')}
              >
                {day.getDate()}
              </button>
              <div className="min-h-0 flex-1 space-y-0.5 overflow-auto">
                {rows.slice(0, 4).map(row => (
                  <button
                    key={`${row.eventId}:${row.occurrenceStartUtc}`}
                    type="button"
                    onClick={() => setPanel({ mode: 'edit', eventId: row.eventId, occurrenceStartUtc: row.occurrenceStartUtc })}
                    className="block w-full truncate rounded bg-indigo-50 px-1.5 py-0.5 text-left text-[11px] text-indigo-900 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-100 dark:hover:bg-indigo-900/60"
                  >
                    {row.allDay ? row.title : `${timeLabel(row.startUtc, row.startTz)} ${row.title}`}
                  </button>
                ))}
                {rows.length > 4 && (
                  <p className="px-1 text-[10px] text-zinc-400">+{rows.length - 4} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {events.error && (
        <p className="border-t border-zinc-200 px-4 py-2 text-xs text-red-600 dark:border-zinc-800">{events.error.message}</p>
      )}

      {panel && (
        <div className="absolute inset-y-0 right-0 z-10 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          {panel.mode === 'create' ? (
            <EventForm
              key={panel.date}
              date={panel.date}
              browserZone={browserZone}
              onClose={() => setPanel(null)}
            />
          ) : (
            <EditEvent
              eventId={panel.eventId}
              occurrenceStartUtc={panel.occurrenceStartUtc}
              browserZone={browserZone}
              onClose={() => setPanel(null)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function EditEvent({
  eventId,
  occurrenceStartUtc,
  browserZone,
  onClose,
}: {
  eventId:            string
  occurrenceStartUtc: string
  browserZone:        string
  onClose:            () => void
}) {
  const event = trpc.calendar.get.useQuery({ id: eventId })
  if (event.isLoading) return <p className="p-6 text-sm text-zinc-500">Loading…</p>
  if (!event.data) return <p className="p-6 text-sm text-zinc-500">Event not found.</p>
  return (
    <EventForm
      key={`${event.data.id}:${event.data.startLocal}:${event.data.rrule ?? ''}`}
      event={event.data}
      occurrenceStartUtc={occurrenceStartUtc}
      browserZone={browserZone}
      onClose={onClose}
    />
  )
}

function EventForm({
  date,
  event,
  occurrenceStartUtc,
  browserZone,
  onClose,
}: {
  date?:               string
  event?:              Series
  occurrenceStartUtc?: string
  browserZone:         string
  onClose:             () => void
}) {
  const utils = trpc.useUtils()
  const create = trpc.calendar.create.useMutation()
  const update = trpc.calendar.update.useMutation()
  const remove = trpc.calendar.remove.useMutation()
  const skip = trpc.calendar.skip.useMutation()
  const zones = useMemo(() => zoneChoices(browserZone), [browserZone])
  const initial = splitLocal(event, date)
  const [title, setTitle] = useState(event?.title ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startDate, setStartDate] = useState(initial.startDate)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endDate, setEndDate] = useState(initial.endDate)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [timeZone, setTimeZone] = useState(event?.timeZone || browserZone)
  const [repeat, setRepeat] = useState(repeatChoice(event?.rrule ?? null))
  const [customRule, setCustomRule] = useState(repeatChoice(event?.rrule ?? null) === 'custom' ? (event?.rrule ?? '') : '')
  const error = create.error ?? update.error ?? remove.error ?? skip.error

  async function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault()
    const rrule = repeat === 'custom'
      ? customRule.trim()
      : PRESETS.find(item => item.id === repeat)?.rrule ?? ''
    const input = {
      title,
      description,
      allDay,
      startLocal: allDay ? startDate : `${startDate}T${startTime}`,
      endLocal:   allDay ? endDate : `${endDate}T${endTime}`,
      timeZone,
      ...(rrule ? { rrule } : {}),
    }
    if (event) await update.mutateAsync({ id: event.id, ...input })
    else await create.mutateAsync(input)
    await utils.calendar.list.invalidate()
    onClose()
  }

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 className="text-sm font-semibold">{event ? 'Event' : 'New event'}</h2>
        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-700" aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
        <label className="block text-xs font-medium text-zinc-500">
          Title
          <input value={title} onChange={e => setTitle(e.target.value)} required className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
          All day
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-medium text-zinc-500">
            Start
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-2 py-2 text-sm outline-none dark:border-zinc-700" />
          </label>
          <label className="block text-xs font-medium text-zinc-500">
            End
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-2 py-2 text-sm outline-none dark:border-zinc-700" />
          </label>
          {!allDay && (
            <>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="rounded-md border border-zinc-200 bg-transparent px-2 py-2 text-sm outline-none dark:border-zinc-700" />
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required className="rounded-md border border-zinc-200 bg-transparent px-2 py-2 text-sm outline-none dark:border-zinc-700" />
            </>
          )}
        </div>
        <label className="block text-xs font-medium text-zinc-500">
          Timezone
          <select value={timeZone} onChange={e => setTimeZone(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-2 py-2 text-sm outline-none dark:border-zinc-700">
            {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-500">
          Repeat
          <select value={repeat} onChange={e => setRepeat(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-2 py-2 text-sm outline-none dark:border-zinc-700">
            {PRESETS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        {repeat === 'custom' && (
          <label className="block text-xs font-medium text-zinc-500">
            Rule
            <input
              value={customRule}
              onChange={e => setCustomRule(e.target.value)}
              placeholder="FREQ=WEEKLY;BYDAY=MO,WE"
              className="mt-1 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 font-mono text-xs outline-none dark:border-zinc-700"
            />
          </label>
        )}
        <label className="block text-xs font-medium text-zinc-500">
          Notes
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 w-full resize-none rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none dark:border-zinc-700" />
        </label>
        {event?.rrule && (
          <p className="text-xs text-zinc-500">
            This event repeats. Saving changes the whole series. The rule is kept as written: {event.rrule}
          </p>
        )}
        {error && <p className="text-xs text-red-600">{error.message}</p>}
      </div>
      <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
        {event ? (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(event.rrule ? 'Delete this event and every repeat?' : 'Delete this event?')) return
                await remove.mutateAsync({ id: event.id })
                await utils.calendar.list.invalidate()
                onClose()
              }}
              className="text-xs text-zinc-500 hover:text-red-600"
            >
              Delete
            </button>
            {event.rrule && occurrenceStartUtc && (
              <button
                type="button"
                onClick={async () => {
                  await skip.mutateAsync({ eventId: event.id, occurrenceStartUtc })
                  await utils.calendar.list.invalidate()
                  await utils.calendar.get.invalidate({ id: event.id })
                }}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                Skip this date
              </button>
            )}
          </div>
        ) : <span />}
        <button
          type="submit"
          disabled={create.isPending || update.isPending}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          Save
        </button>
      </div>
    </form>
  )
}

function monthGrid(monthStart: Date): Date[] {
  const startOffset = (monthStart.getDay() + 6) % 7
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - startOffset)
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1)
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function occurrenceKeys(row: Occurrence): string[] {
  const startKey = zoneDateKey(row.startUtc, row.startTz)
  const endKey = zoneDateKey(new Date(new Date(row.endUtc).getTime() - 1).toISOString(), row.allDay ? row.startTz : row.endTz)
  const keys: string[] = []
  let key = startKey
  while (keys.length < 400) {
    keys.push(key)
    if (key >= endKey) break
    key = shiftDateKey(key, 1)
  }
  return keys
}

function zoneDateKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number)
  const next = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + days))
  return next.toISOString().slice(0, 10)
}

function timeLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}

function splitLocal(event: Series | undefined, date: string | undefined) {
  if (event) {
    const [startDate, startTime] = event.startLocal.split('T')
    const [endDate, endTime] = event.endLocal.split('T')
    return {
      startDate: startDate || date || dateKey(new Date()),
      startTime: startTime || '09:00',
      endDate:   endDate || startDate || date || dateKey(new Date()),
      endTime:   endTime || '10:00',
    }
  }
  const day = date || dateKey(new Date())
  return { startDate: day, startTime: '09:00', endDate: day, endTime: '10:00' }
}

function repeatChoice(rrule: string | null): string {
  if (!rrule) return 'none'
  const preset = PRESETS.find(item => item.id !== 'custom' && item.id !== 'none' && item.rrule === rrule)
  return preset?.id ?? 'custom'
}

function zoneChoices(browserZone: string): string[] {
  const common = [
    'Europe/Helsinki',
    'Europe/London',
    'Europe/Berlin',
    'Europe/Paris',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'UTC',
  ]
  return [browserZone, ...common.filter(zone => zone !== browserZone)]
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
