import { TRPCError } from '@trpc/server'
import { and, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  calendarEvents,
  can,
  canBatch,
  channels,
  channelMembers,
  documents,
  files as filesTable,
  mailMessages,
  searchIndex,
} from '@twork/db'
import { mailboxAddress } from './mailbox.js'
import { buildRfc5322, deliverMail } from './mail-send.js'
import { storeRawMessage } from './mail-store.js'
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

// ── Mail ──────────────────────────────────────────────────────────────────────

const mailRouter = router({
  address: authed.query(({ ctx }) => ({
    address: mailboxAddress(ctx.user.email),
  })),

  list: authed.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id:          mailMessages.id,
        subject:     mailMessages.subject,
        fromAddress: mailMessages.fromAddress,
        toAddresses: mailMessages.toAddresses,
        receivedAt:  mailMessages.receivedAt,
        direction:   mailMessages.direction,
        flags:       mailMessages.flags,
        textBody:    mailMessages.textBody,
      })
      .from(mailMessages)
      .where(and(
        eq(mailMessages.projectId, ctx.session.projectId),
        eq(mailMessages.userId, ctx.session.userId),
        isNull(mailMessages.deletedAt),
      ))
      .orderBy(desc(mailMessages.receivedAt))
      .limit(100)

    const access = await canBatch(
      ctx.session.userId,
      'read',
      rows.map(row => ({ type: 'mail', id: row.id, projectId: ctx.session.projectId })),
      ctx.db,
    )
    return rows
      .filter(row => access.get(row.id))
      .map(row => ({
        id:          row.id,
        subject:     row.subject,
        fromAddress: row.fromAddress,
        toAddresses: row.toAddresses,
        receivedAt:  row.receivedAt,
        direction:   row.direction,
        flags:       row.flags,
        snippet:     snippet(row.textBody),
      }))
  }),

  get: authed
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(mailMessages)
        .where(and(
          eq(mailMessages.id, input.id),
          eq(mailMessages.projectId, ctx.session.projectId),
          isNull(mailMessages.deletedAt),
        ))
        .limit(1)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      const allowed = await can(ctx.session.userId, 'read', {
        type: 'mail', id: row.id, projectId: ctx.session.projectId,
      }, ctx.db)
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
      return {
        id:           row.id,
        subject:      row.subject,
        fromAddress:  row.fromAddress,
        toAddresses:  row.toAddresses,
        ccAddresses:  row.ccAddresses,
        receivedAt:   row.receivedAt,
        direction:    row.direction,
        flags:        row.flags,
        textBody:     row.textBody,
        messageIdHdr: row.messageIdHdr,
      }
    }),

  markRead: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: mailMessages.id, flags: mailMessages.flags })
        .from(mailMessages)
        .where(and(
          eq(mailMessages.id, input.id),
          eq(mailMessages.projectId, ctx.session.projectId),
          eq(mailMessages.userId, ctx.session.userId),
          isNull(mailMessages.deletedAt),
        ))
        .limit(1)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      if (!row.flags.includes('unread')) return { ok: true }
      await ctx.db.update(mailMessages).set({
        flags:     row.flags.filter(flag => flag !== 'unread'),
        updatedAt: new Date(),
      }).where(eq(mailMessages.id, row.id))
      return { ok: true }
    }),

  send: authed
    .input(z.object({
      to:         z.string().email(),
      subject:    z.string().min(1).max(998),
      text:       z.string().min(1).max(200_000),
      inReplyTo:  z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allowed = await can(ctx.session.userId, 'write', {
        type: 'project', id: ctx.session.projectId, projectId: ctx.session.projectId,
      }, ctx.db)
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
      if (!process.env['MAILGUN_API_KEY']) {
        throw new TRPCError({
          code:    'PRECONDITION_FAILED',
          message: 'Outbound mail is not configured yet. Set MAILGUN_API_KEY to send.',
        })
      }

      const fromAddress = mailboxAddress(ctx.user.email)
      const raw = buildRfc5322({
        fromName:    ctx.user.displayName,
        fromAddress,
        to:          input.to,
        subject:     input.subject,
        text:        input.text,
        ...(input.inReplyTo ? { inReplyTo: input.inReplyTo } : {}),
      })
      const id = await storeRawMessage(ctx.db, ctx.storage, {
        projectId: ctx.session.projectId,
        userId:    ctx.session.userId,
        direction: 'outbound',
        raw,
      })
      try {
        await deliverMail({
          fromName:    ctx.user.displayName,
          fromAddress,
          to:          input.to,
          subject:     input.subject,
          text:        input.text,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'send failed'
        throw new TRPCError({ code: 'BAD_GATEWAY', message })
      }
      return { id }
    }),
})

function snippet(text: string | null): string {
  if (!text) return ''
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > 120 ? `${line.slice(0, 117)}…` : line
}

// ── Calendar ──────────────────────────────────────────────────────────────────

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
  mail:     mailRouter,
  schedule: scheduleRouter,
  rooms:    roomsRouter,
  search:   searchRouter,
})

export type AppRouter = typeof appRouter
