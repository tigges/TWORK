import rrule from 'rrule'

const { RRule, datetime } = rrule

const MAX_OCCURRENCES = 1200

export class CalendarError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalendarError'
  }
}

export interface WallClock {
  year:   number
  month:  number
  day:    number
  hour:   number
  minute: number
  second: number
}

export interface StoredEvent {
  id:          string
  title:       string
  description: string | null
  allDay:      boolean
  startUtc:    Date
  startTz:     string
  endUtc:      Date
  endTz:       string
  rrule:       string | null
}

export interface StoredException {
  occurrenceStartUtc: Date
  isCancelled:        boolean
  title:              string | null
  startUtc:           Date | null
  endUtc:             Date | null
}

export interface Occurrence {
  eventId:             string
  occurrenceStartUtc:  Date
  title:               string
  description:         string | null
  allDay:              boolean
  startUtc:            Date
  endUtc:              Date
  startTz:             string
  endTz:               string
  rrule:               string | null
}

export interface EventDraft {
  allDay:     boolean
  startLocal: string
  endLocal:   string
  timeZone:   string
  rrule?:     string | null
}

export interface EventBounds {
  allDay:   boolean
  startUtc: Date
  endUtc:   Date
  startTz:  string
  endTz:    string
  rrule:    string | null
}

export function assertTimeZone(timeZone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(0)
  } catch {
    throw new CalendarError('Pick a valid timezone, such as Europe/Helsinki.')
  }
}

export function wallClock(instant: Date, timeZone: string): WallClock {
  assertTimeZone(timeZone)
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year:      'numeric',
    month:     '2-digit',
    day:       '2-digit',
    hour:      '2-digit',
    minute:    '2-digit',
    second:    '2-digit',
  })
  const bag: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== 'literal') bag[part.type] = part.value
  }
  let hour = numberPart(bag, 'hour')
  if (hour === 24) hour = 0
  return {
    year:   numberPart(bag, 'year'),
    month:  numberPart(bag, 'month'),
    day:    numberPart(bag, 'day'),
    hour,
    minute: numberPart(bag, 'minute'),
    second: numberPart(bag, 'second'),
  }
}

/** Wall-clock time in an IANA timezone, stored later as a UTC instant. */
export function zonedWallToUtc(wall: WallClock, timeZone: string): Date {
  assertTimeZone(timeZone)
  const utcGuess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
  const offset1 = offsetAt(new Date(utcGuess), timeZone)
  let instant = utcGuess - offset1
  const offset2 = offsetAt(new Date(instant), timeZone)
  if (offset2 !== offset1) instant = utcGuess - offset2
  const result = new Date(instant)
  const back = wallClock(result, timeZone)
  if (!sameWall(back, wall)) {
    throw new CalendarError(`That time does not exist in ${timeZone}.`)
  }
  return result
}

/**
 * Turn the form's local values into the stored triple.
 * RRULE text is kept as written (aside from a leading "RRULE:" label and surrounding space).
 * Occurrences are not expanded here.
 */
export function eventBounds(draft: EventDraft): EventBounds {
  const timeZone = draft.timeZone.trim()
  assertTimeZone(timeZone)
  const startWall = parseLocal(draft.startLocal, draft.allDay, 'start')
  const endWall = parseLocal(draft.endLocal, draft.allDay, 'end')
  const startUtc = zonedWallToUtc(startWall, timeZone)
  const endUtc = draft.allDay
    ? zonedWallToUtc(addDays(endWall, 1), timeZone)
    : zonedWallToUtc(endWall, timeZone)
  if (endUtc.getTime() <= startUtc.getTime()) {
    throw new CalendarError(draft.allDay
      ? 'The end date is before the start date.'
      : 'The end time is not after the start time.')
  }
  return {
    allDay: draft.allDay,
    startUtc,
    endUtc,
    startTz: timeZone,
    endTz:   timeZone,
    rrule:   normalizeRrule(draft.rrule),
  }
}

export function formatLocal(instant: Date, timeZone: string, allDay: boolean): string {
  const wall = wallClock(instant, timeZone)
  const date = `${pad(wall.year, 4)}-${pad(wall.month)}-${pad(wall.day)}`
  if (allDay) return date
  return `${date}T${pad(wall.hour)}:${pad(wall.minute)}`
}

/** All-day events store an exclusive end. The form shows the last included day. */
export function inclusiveAllDayEnd(endUtcExclusive: Date, timeZone: string): string {
  return formatLocal(new Date(endUtcExclusive.getTime() - 1), timeZone, true)
}

/**
 * Occurrences inside [windowStart, windowEnd).
 * Recurrence is evaluated at read time. Nothing is written back to the event row.
 */
export function occurrencesBetween(
  event: StoredEvent,
  exceptions: StoredException[],
  windowStart: Date,
  windowEnd: Date,
): Occurrence[] {
  const duration = event.endUtc.getTime() - event.startUtc.getTime()
  if (duration <= 0) return []

  const starts = event.rrule
    ? recurringStarts(event, windowStart, windowEnd, duration)
    : (event.endUtc > windowStart && event.startUtc < windowEnd ? [event.startUtc] : [])

  const byOriginal = new Map(exceptions.map(row => [row.occurrenceStartUtc.getTime(), row]))
  const found: Occurrence[] = []
  for (const occurrenceStartUtc of starts) {
    const exception = byOriginal.get(occurrenceStartUtc.getTime())
    if (exception?.isCancelled) continue
    const startUtc = exception?.startUtc ?? occurrenceStartUtc
    const endUtc = exception?.endUtc ?? new Date(occurrenceStartUtc.getTime() + duration)
    if (endUtc <= windowStart || startUtc >= windowEnd) continue
    found.push({
      eventId:            event.id,
      occurrenceStartUtc,
      title:              exception?.title || event.title,
      description:        event.description,
      allDay:             event.allDay,
      startUtc,
      endUtc,
      startTz:            event.startTz,
      endTz:              event.endTz,
      rrule:              event.rrule,
    })
  }
  return found
}

export function normalizeRrule(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/[\r\n]/.test(trimmed)) throw new CalendarError('A repeat rule must be a single line.')
  const body = trimmed.replace(/^RRULE:/i, '')
  if (!body) throw new CalendarError('A repeat rule needs FREQ.')
  try {
    const parsed = RRule.parseString(body)
    if (parsed.freq === undefined) throw new Error('missing FREQ')
    const probe = new RRule({ ...parsed, dtstart: datetime(2026, 1, 5, 9, 0, 0) })
    probe.between(datetime(2026, 1, 1, 0, 0, 0), datetime(2026, 3, 1, 0, 0, 0), true)
  } catch {
    throw new CalendarError('That repeat rule could not be read. Use a rule like FREQ=WEEKLY.')
  }
  return body
}

function recurringStarts(event: StoredEvent, windowStart: Date, windowEnd: Date, duration: number): Date[] {
  const ruleText = event.rrule
  if (!ruleText) return []
  let parsed: ReturnType<typeof RRule.parseString>
  try {
    parsed = RRule.parseString(ruleText)
    if (parsed.freq === undefined) return [event.startUtc]
  } catch {
    return event.endUtc > windowStart && event.startUtc < windowEnd ? [event.startUtc] : []
  }

  const startWall = wallClock(event.startUtc, event.startTz)
  const dtstart = datetime(startWall.year, startWall.month, startWall.day, startWall.hour, startWall.minute, startWall.second)
  const rule = new RRule({ ...parsed, dtstart })
  const floatAfter = asFloating(new Date(windowStart.getTime() - duration), event.startTz)
  const floatBefore = asFloating(windowEnd, event.startTz)
  let floating: Date[]
  try {
    floating = rule.between(floatAfter, floatBefore, true, (_date, len) => len < MAX_OCCURRENCES)
  } catch {
    return event.endUtc > windowStart && event.startUtc < windowEnd ? [event.startUtc] : []
  }

  const starts: Date[] = []
  for (const hit of floating) {
    const wall: WallClock = {
      year:   hit.getUTCFullYear(),
      month:  hit.getUTCMonth() + 1,
      day:    hit.getUTCDate(),
      hour:   hit.getUTCHours(),
      minute: hit.getUTCMinutes(),
      second: hit.getUTCSeconds(),
    }
    try {
      starts.push(zonedWallToUtc(wall, event.startTz))
    } catch {
      // A recurrence can land in a DST gap. Skip that one occurrence.
    }
  }
  return starts
}

function asFloating(instant: Date, timeZone: string): Date {
  const wall = wallClock(instant, timeZone)
  return datetime(wall.year, wall.month, wall.day, wall.hour, wall.minute, wall.second)
}

function parseLocal(value: string, allDay: boolean, which: 'start' | 'end'): WallClock {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(value.trim())
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new CalendarError(`Enter a ${which} date.`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hasTime = match[4] !== undefined
  if (allDay && hasTime) throw new CalendarError(`An all-day ${which} is a date, not a time.`)
  if (!allDay && !hasTime) throw new CalendarError(`Enter a ${which} time.`)
  const hour = hasTime ? Number(match[4]) : 0
  const minute = hasTime ? Number(match[5]) : 0
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    throw new CalendarError(`That ${which} is not a real date.`)
  }
  return { year, month, day, hour, minute, second: 0 }
}

function addDays(wall: WallClock, days: number): WallClock {
  const shifted = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days))
  return {
    year:   shifted.getUTCFullYear(),
    month:  shifted.getUTCMonth() + 1,
    day:    shifted.getUTCDate(),
    hour:   0,
    minute: 0,
    second: 0,
  }
}

function offsetAt(instant: Date, timeZone: string): number {
  const wall = wallClock(instant, timeZone)
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
  return asUtc - instant.getTime()
}

function sameWall(a: WallClock, b: WallClock): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
    && a.hour === b.hour && a.minute === b.minute && a.second === b.second
}

function numberPart(bag: Record<string, string>, key: string): number {
  const value = bag[key]
  if (value === undefined) throw new CalendarError('Could not read that timezone.')
  return Number(value)
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}
