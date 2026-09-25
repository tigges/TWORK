import { TRPCError } from '@trpc/server'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import {
  auditLog,
  can,
  channelMembers,
  channels,
  chatMessages,
  users,
} from '@twork/db'
import { authed, router } from './trpc.js'

async function assertWrite(ctx: { session: { userId: string; projectId: string }; db: Parameters<typeof can>[3] }) {
  const allowed = await can(ctx.session.userId, 'write', {
    type: 'project', id: ctx.session.projectId, projectId: ctx.session.projectId,
  }, ctx.db)
  if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
}

async function membership(
  ctx: { session: { userId: string; projectId: string }; db: Parameters<typeof can>[3] },
  channelId: string,
) {
  const [row] = await ctx.db
    .select({ id: channels.id, name: channels.name, isDm: channels.isDm })
    .from(channels)
    .innerJoin(channelMembers, and(
      eq(channelMembers.channelId, channels.id),
      eq(channelMembers.userId, ctx.session.userId),
      isNull(channelMembers.deletedAt),
    ))
    .where(and(
      eq(channels.id, channelId),
      eq(channels.projectId, ctx.session.projectId),
      isNull(channels.deletedAt),
    ))
    .limit(1)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  return row
}

export const chatRouter = router({
  list: authed.query(async ({ ctx }) =>
    ctx.db
      .select({ id: channels.id, name: channels.name, isDm: channels.isDm })
      .from(channels)
      .innerJoin(channelMembers, and(
        eq(channelMembers.channelId, channels.id),
        eq(channelMembers.userId, ctx.session.userId),
        isNull(channelMembers.deletedAt),
      ))
      .where(and(eq(channels.projectId, ctx.session.projectId), isNull(channels.deletedAt)))
      .orderBy(asc(channels.createdAt)),
  ),

  ensureDirect: authed.mutation(async ({ ctx }) => {
    await assertWrite(ctx)
    const [existing] = await ctx.db
      .select({ id: channels.id })
      .from(channels)
      .innerJoin(channelMembers, and(
        eq(channelMembers.channelId, channels.id),
        eq(channelMembers.userId, ctx.session.userId),
        isNull(channelMembers.deletedAt),
      ))
      .where(and(
        eq(channels.projectId, ctx.session.projectId),
        eq(channels.isDm, true),
        isNull(channels.deletedAt),
      ))
      .limit(1)
    if (existing) return { id: existing.id }

    const id = uuidv7()
    const now = new Date()
    try {
      await ctx.db.transaction(async tx => {
        await tx.insert(channels).values({
          id,
          projectId: ctx.session.projectId,
          name:      'Direct',
          isDm:      true,
          createdBy: ctx.session.userId,
          createdAt: now,
          updatedAt: now,
        })
        await tx.insert(channelMembers).values({
          id:        uuidv7(),
          projectId: ctx.session.projectId,
          channelId: id,
          userId:    ctx.session.userId,
          createdAt: now,
          updatedAt: now,
        })
      })
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
      const [race] = await ctx.db
        .select({ id: channels.id })
        .from(channels)
        .where(and(
          eq(channels.projectId, ctx.session.projectId),
          eq(channels.isDm, true),
          isNull(channels.deletedAt),
        ))
        .limit(1)
      if (!race) throw err
      return { id: race.id }
    }
    return { id }
  }),

  createRoom: authed
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await assertWrite(ctx)
      const id = uuidv7()
      const now = new Date()
      await ctx.db.transaction(async tx => {
        await tx.insert(channels).values({
          id,
          projectId: ctx.session.projectId,
          name:      input.name,
          isDm:      false,
          createdBy: ctx.session.userId,
          createdAt: now,
          updatedAt: now,
        })
        await tx.insert(channelMembers).values({
          id:        uuidv7(),
          projectId: ctx.session.projectId,
          channelId: id,
          userId:    ctx.session.userId,
          createdAt: now,
          updatedAt: now,
        })
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'chat.room',
          objectType: 'channel',
          objectId:   id,
          after:      { name: input.name },
        })
      })
      return { id }
    }),

  messages: authed
    .input(z.object({
      channelId: z.string().uuid(),
      parentId:  z.string().uuid().nullable().default(null),
    }))
    .query(async ({ ctx, input }) => {
      await membership(ctx, input.channelId)
      const rows = await ctx.db
        .select({
          id:        chatMessages.id,
          body:      chatMessages.body,
          parentId:  chatMessages.parentId,
          createdAt: chatMessages.createdAt,
          author:    users.displayName,
        })
        .from(chatMessages)
        .innerJoin(users, eq(users.id, chatMessages.userId))
        .where(and(
          eq(chatMessages.channelId, input.channelId),
          eq(chatMessages.projectId, ctx.session.projectId),
          isNull(chatMessages.deletedAt),
          input.parentId ? eq(chatMessages.parentId, input.parentId) : isNull(chatMessages.parentId),
        ))
        .orderBy(asc(chatMessages.createdAt))
        .limit(200)
      return rows
    }),

  send: authed
    .input(z.object({
      channelId: z.string().uuid(),
      parentId:  z.string().uuid().nullable().default(null),
      body:      z.string().trim().min(1).max(4000),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWrite(ctx)
      await membership(ctx, input.channelId)
      if (input.parentId) {
        const [parent] = await ctx.db
          .select({ id: chatMessages.id })
          .from(chatMessages)
          .where(and(
            eq(chatMessages.id, input.parentId),
            eq(chatMessages.channelId, input.channelId),
            isNull(chatMessages.parentId),
            isNull(chatMessages.deletedAt),
          ))
          .limit(1)
        if (!parent) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Reply to a message in this room.' })
      }
      const id = uuidv7()
      await ctx.db.insert(chatMessages).values({
        id,
        projectId: ctx.session.projectId,
        channelId: input.channelId,
        userId:    ctx.session.userId,
        parentId:  input.parentId,
        body:      input.body,
      })
      return { id }
    }),
})

function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
    if ('code' in current && (current as { code: unknown }).code === '23505') return true
    current = 'cause' in current ? (current as { cause: unknown }).cause : null
  }
  return false
}
