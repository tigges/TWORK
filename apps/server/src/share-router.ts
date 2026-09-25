import { TRPCError } from '@trpc/server'
import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { auditLog, calendarEvents, can, contacts, files } from '@twork/db'
import { z } from 'zod'
import { listShares, replaceShares, shareTypes, type ShareType } from './shares.js'
import { authed, router } from './trpc.js'

const shareInput = z.object({
  type: z.enum(shareTypes),
  id:   z.string().uuid(),
})

export const shareRouter = router({
  list: authed
    .input(shareInput)
    .query(async ({ ctx, input }) => {
      await assertShareRead(ctx, input.type, input.id)
      return listShares(ctx.db, ctx.session.projectId, input.type, input.id)
    }),

  set: authed
    .input(shareInput.extend({
      contactIds: z.array(z.string().uuid()).max(24),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertShareWrite(ctx, input.type, input.id)
      await ctx.db.transaction(async tx => {
        await replaceShares(tx as unknown as Parameters<typeof can>[3], {
          projectId:  ctx.session.projectId,
          userId:     ctx.session.userId,
          objectType: input.type,
          objectId:   input.id,
          contactIds: input.contactIds,
          ...(input.type === 'contact' ? { forbidId: input.id } : {}),
        })
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'share.set',
          objectType: input.type,
          objectId:   input.id,
          after:      { contactIds: input.contactIds },
        })
      })
      return { ok: true }
    }),
})

type Ctx = {
  db:      Parameters<typeof can>[3]
  session: { userId: string; projectId: string }
  user:    { email: string }
}

async function assertShareRead(ctx: Ctx, type: ShareType, id: string) {
  if (type === 'contact') {
    const [row] = await ctx.db
      .select({ id: contacts.id, userId: contacts.userId })
      .from(contacts)
      .where(and(
        eq(contacts.id, id),
        eq(contacts.projectId, ctx.session.projectId),
        isNull(contacts.deletedAt),
      ))
      .limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
    if (row.userId === ctx.session.userId) return
    const allowed = await can(ctx.session.userId, 'read', {
      type: 'contact', id, projectId: ctx.session.projectId,
    }, ctx.db)
    if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
    return
  }
  await loadSharedObject(ctx, type, id, 'read')
}

async function assertShareWrite(ctx: Ctx, type: ShareType, id: string) {
  if (type === 'contact') {
    const [row] = await ctx.db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.id, id),
        eq(contacts.projectId, ctx.session.projectId),
        eq(contacts.userId, ctx.session.userId),
        isNull(contacts.deletedAt),
      ))
      .limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
    const allowed = await can(ctx.session.userId, 'write', {
      type: 'contact', id, projectId: ctx.session.projectId,
    }, ctx.db)
    if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
    return
  }
  await loadSharedObject(ctx, type, id, 'write')
}

async function loadSharedObject(ctx: Ctx, type: 'file' | 'event', id: string, action: 'read' | 'write') {
  if (type === 'file') {
    const [row] = await ctx.db
      .select({ id: files.id })
      .from(files)
      .where(and(
        eq(files.id, id),
        eq(files.projectId, ctx.session.projectId),
        isNull(files.deletedAt),
      ))
      .limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  } else {
    const [row] = await ctx.db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(and(
        eq(calendarEvents.id, id),
        eq(calendarEvents.projectId, ctx.session.projectId),
        isNull(calendarEvents.deletedAt),
      ))
      .limit(1)
    if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  }
  const allowed = await can(ctx.session.userId, action, {
    type, id, projectId: ctx.session.projectId,
  }, ctx.db)
  if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
}
