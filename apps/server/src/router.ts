import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  calendarEvents,
  channels,
  channelMembers,
  chatMessages,
  documents,
  files as filesTable,
  mailThreads,
  searchIndex,
} from '@twork/db'
import { authed, router } from './trpc.js'

// ── Files ─────────────────────────────────────────────────────────────────────

const filesRouter = router({
  list: authed
    .input(z.object({ parentId: z.string().nullable().default(null) }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.projectId, ctx.session.projectId),
            input.parentId
              ? eq(filesTable.parentId, input.parentId)
              : isNull(filesTable.parentId),
            isNull(filesTable.deletedAt),
          ),
        )
    }),
})

// ── Pages ─────────────────────────────────────────────────────────────────────

const pagesRouter = router({
  list: authed.query(async ({ ctx }) =>
    ctx.db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, ctx.session.projectId), isNull(documents.deletedAt))),
  ),
})

// ── Post (mail) ───────────────────────────────────────────────────────────────

const postRouter = router({
  threads: authed.query(async ({ ctx }) =>
    ctx.db
      .select()
      .from(mailThreads)
      .where(and(eq(mailThreads.projectId, ctx.session.projectId), isNull(mailThreads.deletedAt))),
  ),
})

// ── Schedule (calendar) ───────────────────────────────────────────────────────

const scheduleRouter = router({
  events: authed
    .input(z.object({ from: z.string(), to: z.string() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select()
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.projectId, ctx.session.projectId),
            isNull(calendarEvents.deletedAt),
            gte(calendarEvents.startUtc, new Date(input.from)),
            lte(calendarEvents.endUtc,   new Date(input.to)),
          ),
        ),
    ),
})

// ── Rooms (chat) ──────────────────────────────────────────────────────────────

const roomsRouter = router({
  channels: authed.query(async ({ ctx }) =>
    ctx.db
      .select({ id: channels.id, name: channels.name, topic: channels.topic, isDm: channels.isDm })
      .from(channels)
      .innerJoin(
        channelMembers,
        and(
          eq(channelMembers.channelId, channels.id),
          eq(channelMembers.userId,    ctx.session.userId),
          isNull(channelMembers.deletedAt),
        ),
      )
      .where(and(eq(channels.projectId, ctx.session.projectId), isNull(channels.deletedAt))),
  ),
})

// ── Search ────────────────────────────────────────────────────────────────────

const searchRouter = router({
  query: authed
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select({
          objectType: searchIndex.objectType,
          objectId:   searchIndex.objectId,
          plainText:  searchIndex.plainText,
        })
        .from(searchIndex)
        .where(
          sql`${searchIndex.projectId} = ${ctx.session.projectId}
            AND to_tsvector('english', ${searchIndex.plainText}) @@ plainto_tsquery('english', ${input.q})`,
        )
        .limit(50),
    ),
})

// ── App router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  files:    filesRouter,
  pages:    pagesRouter,
  post:     postRouter,
  schedule: scheduleRouter,
  rooms:    roomsRouter,
  search:   searchRouter,
})

export type AppRouter = typeof appRouter
