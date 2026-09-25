import { TRPCError } from '@trpc/server'
import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import { auditLog, tasks, type DB } from '@twork/db'
import { authed, router } from './trpc.js'

export const tasksRouter = router({
  list: authed.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id:        tasks.id,
        title:     tasks.title,
        doneAt:    tasks.doneAt,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(and(
        eq(tasks.projectId, ctx.session.projectId),
        eq(tasks.userId, ctx.session.userId),
        isNull(tasks.deletedAt),
      ))
      .orderBy(sql`${tasks.doneAt} IS NULL DESC`, asc(tasks.createdAt))
      .limit(30)
    return rows.map(row => ({
      id:        row.id,
      title:     row.title,
      doneAt:    row.doneAt ? row.doneAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    }))
  }),

  create: authed
    .input(z.object({ title: z.string().trim().min(1).max(200) }))
    .mutation(async ({ ctx, input }) => {
      const id = uuidv7()
      await ctx.db.transaction(async tx => {
        await tx.insert(tasks).values({
          id,
          projectId: ctx.session.projectId,
          userId:    ctx.session.userId,
          title:     input.title,
        })
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'task.create',
          objectType: 'task',
          objectId:   id,
          after:      { title: input.title },
        })
      })
      return { id }
    }),

  toggle: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadTask(ctx, input.id)
      const doneAt = row.doneAt ? null : new Date()
      await ctx.db.transaction(async tx => {
        await tx.update(tasks).set({ doneAt, updatedAt: new Date() }).where(eq(tasks.id, row.id))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'task.toggle',
          objectType: 'task',
          objectId:   row.id,
          after:      { done: !!doneAt },
        })
      })
      return { id: row.id, doneAt: doneAt ? doneAt.toISOString() : null }
    }),

  remove: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadTask(ctx, input.id)
      const now = new Date()
      await ctx.db.transaction(async tx => {
        await tx.update(tasks).set({ deletedAt: now, updatedAt: now }).where(eq(tasks.id, row.id))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'task.delete',
          objectType: 'task',
          objectId:   row.id,
          before:     { title: row.title },
        })
      })
      return { ok: true }
    }),
})

async function loadTask(
  ctx: { session: { userId: string; projectId: string }; db: DB },
  id: string,
) {
  const [row] = await ctx.db
    .select()
    .from(tasks)
    .where(and(
      eq(tasks.id, id),
      eq(tasks.projectId, ctx.session.projectId),
      eq(tasks.userId, ctx.session.userId),
      isNull(tasks.deletedAt),
    ))
    .limit(1)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  return row
}
