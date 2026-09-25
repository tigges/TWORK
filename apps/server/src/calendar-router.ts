import { TRPCError } from '@trpc/server'
import { and, eq, gt, inArray, isNotNull, isNull, lt, or } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import {
  CalendarError,
  auditLog,
  calendarEventExceptions,
  calendarEvents,
  can,
  canBatch,
  eventBounds,
  formatLocal,
  inclusiveAllDayEnd,
  occurrencesBetween,
  searchIndex,
  shares,
} from '@twork/db'
import type { StoredEvent, StoredException } from '@twork/db'
import { isSharedWith, objectIdsSharedWith, replaceShares, shareNames } from './shares.js'
import { authed, router } from './trpc.js'

const MAX_WINDOW_MS = 70 * 24 * 60 * 60 * 1000

const draftInput = z.object({
  title:       z.string().trim().min(1).max(300),
  description: z.string().trim().max(8000).optional(),
  allDay:      z.boolean(),
  startLocal:  z.string().trim().max(16),
  endLocal:    z.string().trim().max(16),
  timeZone:    z.string().trim().min(1).max(80),
  rrule:       z.string().trim().max(500).optional(),
  contactIds:  z.array(z.string().uuid()).max(24).default([]),
})

export const calendarRouter = router({
  list: authed
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) => {
      const from = new Date(input.from)
      const to = new Date(input.to)
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Pick a valid date range.' })
      }
      if (to.getTime() - from.getTime() > MAX_WINDOW_MS) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'That date range is too long.' })
      }

      const rows = await ctx.db
        .select()
        .from(calendarEvents)
        .where(and(
          eq(calendarEvents.projectId, ctx.session.projectId),
          isNull(calendarEvents.deletedAt),
          or(
            and(
              isNull(calendarEvents.rrule),
              lt(calendarEvents.startUtc, to),
              gt(calendarEvents.endUtc, from),
            ),
            and(
              isNotNull(calendarEvents.rrule),
              lt(calendarEvents.startUtc, to),
            ),
          ),
        ))

      const sharedIds = new Set(await objectIdsSharedWith(ctx.db, ctx.session.projectId, ctx.user.email, 'event'))
      const access = await canBatch(
        ctx.session.userId,
        'read',
        rows.map(row => ({ type: 'event', id: row.id, projectId: ctx.session.projectId })),
        ctx.db,
      )
      const visible = rows.filter(row => access.get(row.id) || sharedIds.has(row.id))
      if (visible.length === 0) return []

      const exceptionRows = await ctx.db
        .select()
        .from(calendarEventExceptions)
        .where(and(
          inArray(calendarEventExceptions.eventId, visible.map(row => row.id)),
          isNull(calendarEventExceptions.deletedAt),
        ))
      const exceptions = new Map<string, StoredException[]>()
      for (const row of exceptionRows) {
        const list = exceptions.get(row.eventId) ?? []
        list.push({
          occurrenceStartUtc: row.occurrenceStartUtc,
          isCancelled:         row.isCancelled,
          title:               row.title,
          startUtc:            row.startUtc,
          endUtc:              row.endUtc,
        })
        exceptions.set(row.eventId, list)
      }

      const people = await shareNames(ctx.db, ctx.session.projectId, 'event', visible.map(row => row.id))
      const occurrences = visible.flatMap(row => occurrencesBetween(
        toStored(row),
        exceptions.get(row.id) ?? [],
        from,
        to,
      ).map(occurrence => ({
        eventId:            occurrence.eventId,
        occurrenceStartUtc: occurrence.occurrenceStartUtc.toISOString(),
        title:              occurrence.title,
        allDay:             occurrence.allDay,
        startUtc:           occurrence.startUtc.toISOString(),
        endUtc:             occurrence.endUtc.toISOString(),
        startTz:            occurrence.startTz,
        endTz:              occurrence.endTz,
        rrule:              occurrence.rrule,
        people:             (people.get(occurrence.eventId) ?? []).map(person => person.name),
      })))
      occurrences.sort((a, b) => a.startUtc.localeCompare(b.startUtc) || a.title.localeCompare(b.title))
      return occurrences
    }),

  get: authed
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await loadEvent(ctx, input.id, 'read')
      return {
        id:          row.id,
        title:       row.title,
        description: row.description,
        allDay:      row.allDay,
        startLocal:  formatLocal(row.startUtc, row.startTz, row.allDay),
        endLocal:    row.allDay
          ? inclusiveAllDayEnd(row.endUtc, row.endTz)
          : formatLocal(row.endUtc, row.endTz, false),
        timeZone: row.startTz,
        rrule:    row.rrule,
        startUtc: row.startUtc.toISOString(),
        endUtc:   row.endUtc.toISOString(),
        startTz:  row.startTz,
        endTz:    row.endTz,
        invitees: (await shareNames(ctx.db, ctx.session.projectId, 'event', [row.id])).get(row.id) ?? [],
      }
    }),

  create: authed
    .input(draftInput)
    .mutation(async ({ ctx, input }) => {
      await assertProjectWrite(ctx)
      const bounds = boundsOrThrow(input)
      const id = uuidv7()
      const description = input.description?.trim() || null
      await ctx.db.transaction(async tx => {
        await tx.insert(calendarEvents).values({
          id,
          projectId:   ctx.session.projectId,
          title:       input.title,
          description,
          allDay:      bounds.allDay,
          startUtc:    bounds.startUtc,
          startTz:     bounds.startTz,
          endUtc:      bounds.endUtc,
          endTz:       bounds.endTz,
          rrule:       bounds.rrule,
          createdBy:   ctx.session.userId,
        })
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'event.create',
          objectType: 'event',
          objectId:   id,
          after:      auditShape(input.title, bounds),
        })
        await tx.insert(searchIndex).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          objectType: 'event',
          objectId:   id,
          plainText:  searchText(input.title, description),
        })
        await replaceShares(tx as unknown as Parameters<typeof can>[3], {
          projectId:  ctx.session.projectId,
          userId:     ctx.session.userId,
          objectType: 'event',
          objectId:   id,
          contactIds: input.contactIds,
        })
      })
      return { id }
    }),

  update: authed
    .input(draftInput.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadEvent(ctx, input.id, 'write')
      const bounds = boundsOrThrow(input)
      const description = input.description?.trim() || null
      const seriesMoved = row.startUtc.getTime() !== bounds.startUtc.getTime()
        || (row.rrule ?? '') !== (bounds.rrule ?? '')
      await ctx.db.transaction(async tx => {
        await tx.update(calendarEvents).set({
          title:       input.title,
          description,
          allDay:      bounds.allDay,
          startUtc:    bounds.startUtc,
          startTz:     bounds.startTz,
          endUtc:      bounds.endUtc,
          endTz:       bounds.endTz,
          rrule:       bounds.rrule,
          updatedAt:   new Date(),
        }).where(eq(calendarEvents.id, row.id))
        if (seriesMoved) {
          await tx.update(calendarEventExceptions).set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          }).where(and(
            eq(calendarEventExceptions.eventId, row.id),
            isNull(calendarEventExceptions.deletedAt),
          ))
        }
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'event.update',
          objectType: 'event',
          objectId:   row.id,
          before:     auditShape(row.title, {
            allDay: row.allDay, startUtc: row.startUtc, endUtc: row.endUtc,
            startTz: row.startTz, endTz: row.endTz, rrule: row.rrule,
          }),
          after: auditShape(input.title, bounds),
        })
        await tx.insert(searchIndex).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          objectType: 'event',
          objectId:   row.id,
          plainText:  searchText(input.title, description),
        }).onConflictDoUpdate({
          target: [searchIndex.projectId, searchIndex.objectType, searchIndex.objectId],
          set:    { plainText: searchText(input.title, description), updatedAt: new Date() },
        })
        await replaceShares(tx as unknown as Parameters<typeof can>[3], {
          projectId:  ctx.session.projectId,
          userId:     ctx.session.userId,
          objectType: 'event',
          objectId:   row.id,
          contactIds: input.contactIds,
        })
      })
      return { id: row.id }
    }),

  remove: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadEvent(ctx, input.id, 'delete')
      const now = new Date()
      await ctx.db.transaction(async tx => {
        await tx.update(calendarEvents).set({ deletedAt: now, updatedAt: now }).where(eq(calendarEvents.id, row.id))
        await tx.update(calendarEventExceptions).set({ deletedAt: now, updatedAt: now }).where(and(
          eq(calendarEventExceptions.eventId, row.id),
          isNull(calendarEventExceptions.deletedAt),
        ))
        await tx.delete(searchIndex).where(and(
          eq(searchIndex.projectId, ctx.session.projectId),
          eq(searchIndex.objectType, 'event'),
          eq(searchIndex.objectId, row.id),
        ))
        await tx.update(shares).set({ deletedAt: now, updatedAt: now }).where(and(
          eq(shares.projectId, ctx.session.projectId),
          eq(shares.objectType, 'event'),
          eq(shares.objectId, row.id),
          isNull(shares.deletedAt),
        ))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'event.delete',
          objectType: 'event',
          objectId:   row.id,
          before:     { title: row.title, rrule: row.rrule },
        })
      })
      return { ok: true }
    }),

  skip: authed
    .input(z.object({
      eventId:            z.string().uuid(),
      occurrenceStartUtc: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadEvent(ctx, input.eventId, 'write')
      if (!row.rrule) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'This event does not repeat.' })
      }
      const occurrenceStartUtc = new Date(input.occurrenceStartUtc)
      if (Number.isNaN(occurrenceStartUtc.getTime())) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'That occurrence is not a valid time.' })
      }
      const now = new Date()
      await ctx.db.transaction(async tx => {
        const [existing] = await tx
          .select({ id: calendarEventExceptions.id })
          .from(calendarEventExceptions)
          .where(and(
            eq(calendarEventExceptions.eventId, row.id),
            eq(calendarEventExceptions.occurrenceStartUtc, occurrenceStartUtc),
          ))
          .limit(1)
        if (existing) {
          await tx.update(calendarEventExceptions).set({
            isCancelled: true,
            deletedAt:   null,
            updatedAt:   now,
          }).where(eq(calendarEventExceptions.id, existing.id))
        } else {
          await tx.insert(calendarEventExceptions).values({
            id:                 uuidv7(),
            projectId:          ctx.session.projectId,
            eventId:            row.id,
            occurrenceStartUtc,
            isCancelled:        true,
          })
        }
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'event.skip',
          objectType: 'event',
          objectId:   row.id,
          after:      { occurrenceStartUtc: occurrenceStartUtc.toISOString() },
        })
      })
      return { ok: true }
    }),
})

function boundsOrThrow(input: z.infer<typeof draftInput>) {
  try {
    return eventBounds({
      allDay:     input.allDay,
      startLocal: input.startLocal,
      endLocal:   input.endLocal,
      timeZone:   input.timeZone,
      ...(input.rrule ? { rrule: input.rrule } : {}),
    })
  } catch (err) {
    if (err instanceof CalendarError) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: err.message })
    }
    throw err
  }
}

function toStored(row: typeof calendarEvents.$inferSelect): StoredEvent {
  return {
    id:          row.id,
    title:       row.title,
    description: row.description,
    allDay:      row.allDay,
    startUtc:    row.startUtc,
    startTz:     row.startTz,
    endUtc:      row.endUtc,
    endTz:       row.endTz,
    rrule:       row.rrule,
  }
}

function auditShape(title: string, bounds: {
  allDay: boolean
  startUtc: Date
  endUtc: Date
  startTz: string
  endTz: string
  rrule: string | null
}) {
  return {
    title,
    allDay:   bounds.allDay,
    startUtc: bounds.startUtc.toISOString(),
    startTz:  bounds.startTz,
    endUtc:   bounds.endUtc.toISOString(),
    endTz:    bounds.endTz,
    rrule:    bounds.rrule,
  }
}

function searchText(title: string, description: string | null): string {
  return [title, description].filter((part): part is string => !!part && part.length > 0).join('\n')
}

async function assertProjectWrite(ctx: Authed) {
  const allowed = await can(ctx.session.userId, 'write', {
    type: 'project', id: ctx.session.projectId, projectId: ctx.session.projectId,
  }, ctx.db)
  if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
}

type Authed = {
  session: { userId: string; projectId: string }
  user:    { email: string }
  db:      Parameters<typeof can>[3]
}

async function loadEvent(ctx: Authed, id: string, action: 'read' | 'write' | 'delete') {
  const [row] = await ctx.db
    .select()
    .from(calendarEvents)
    .where(and(
      eq(calendarEvents.id, id),
      eq(calendarEvents.projectId, ctx.session.projectId),
      isNull(calendarEvents.deletedAt),
    ))
    .limit(1)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  const allowed = await can(ctx.session.userId, action, {
    type: 'event', id: row.id, projectId: ctx.session.projectId,
  }, ctx.db)
  if (allowed) return row
  if (action === 'read' && await isSharedWith(ctx.db, ctx.session.projectId, ctx.user.email, 'event', row.id)) {
    return row
  }
  throw new TRPCError({ code: 'FORBIDDEN' })
}
