import { TRPCError } from '@trpc/server'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import {
  auditLog,
  blobs,
  can,
  documentRevisions,
  documents,
  searchIndex,
} from '@twork/db'
import { ensureBlob, retainBlob } from './blob-store.js'
import { decodeNote, encodeNote, notePlainText, normalizeBlocks, type NoteBlock } from './note-blocks.js'
import { authed, router } from './trpc.js'

const blockInput = z.object({
  type: z.enum(['text', 'heading', 'list']),
  text: z.string().max(20_000),
})

async function assertWrite(ctx: { session: { userId: string; projectId: string }; db: Parameters<typeof can>[3] }) {
  const allowed = await can(ctx.session.userId, 'write', {
    type: 'project', id: ctx.session.projectId, projectId: ctx.session.projectId,
  }, ctx.db)
  if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
}

async function loadDocument(ctx: { session: { projectId: string }; db: Parameters<typeof can>[3] }, id: string) {
  const [row] = await ctx.db
    .select()
    .from(documents)
    .where(and(
      eq(documents.id, id),
      eq(documents.projectId, ctx.session.projectId),
      isNull(documents.deletedAt),
    ))
    .limit(1)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  return row
}

export const notesRouter = router({
  list: authed.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id:        documents.id,
        title:     documents.title,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(eq(documents.projectId, ctx.session.projectId), isNull(documents.deletedAt)))
      .orderBy(desc(documents.updatedAt))
      .limit(200)
    return rows
  }),

  get: authed
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const doc = await loadDocument(ctx, input.id)
      const revisions = await ctx.db
        .select({
          id:         documentRevisions.id,
          createdAt:  documentRevisions.createdAt,
          storageKey: blobs.storageKey,
        })
        .from(documentRevisions)
        .innerJoin(blobs, eq(blobs.id, documentRevisions.blobId))
        .where(eq(documentRevisions.documentId, doc.id))
        .orderBy(desc(documentRevisions.createdAt))
        .limit(40)

      const latest = revisions[0]
      let blocks: NoteBlock[] = [{ type: 'text', text: '' }]
      if (latest) {
        const raw = await ctx.storage.getBuffer(latest.storageKey)
        blocks = decodeNote(raw)
      }
      return {
        id:         doc.id,
        title:      doc.title,
        updatedAt:  doc.updatedAt,
        revisionId: latest?.id ?? null,
        blocks,
        revisions:  revisions.map(row => ({ id: row.id, createdAt: row.createdAt })),
      }
    }),

  create: authed.mutation(async ({ ctx }) => {
    await assertWrite(ctx)
    const id = uuidv7()
    const now = new Date()
    await ctx.db.insert(documents).values({
      id,
      projectId: ctx.session.projectId,
      title:     'Untitled',
      createdBy: ctx.session.userId,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert(auditLog).values({
      id:         uuidv7(),
      projectId:  ctx.session.projectId,
      actorId:    ctx.session.userId,
      action:     'note.create',
      objectType: 'document',
      objectId:   id,
      after:      { title: 'Untitled' },
    })
    return { id }
  }),

  save: authed
    .input(z.object({
      id:     z.string().uuid(),
      title:  z.string().trim().max(200),
      blocks: z.array(blockInput).max(200),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWrite(ctx)
      const doc = await loadDocument(ctx, input.id)
      const title = input.title.trim() || 'Untitled'
      const blocks = normalizeBlocks(input.blocks)
      const raw = encodeNote(blocks)
      const blobId = await ensureBlob(ctx.db, ctx.storage, ctx.session.projectId, raw, 'application/json')

      const [latest] = await ctx.db
        .select({ blobId: documentRevisions.blobId })
        .from(documentRevisions)
        .where(eq(documentRevisions.documentId, doc.id))
        .orderBy(desc(documentRevisions.createdAt))
        .limit(1)

      const now = new Date()
      if (latest?.blobId !== blobId) {
        await ctx.db.insert(documentRevisions).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          documentId: doc.id,
          blobId,
          createdBy:  ctx.session.userId,
          createdAt:  now,
        })
        await retainBlob(ctx.db, blobId)
      }

      await ctx.db.update(documents).set({ title, updatedAt: now }).where(eq(documents.id, doc.id))
      const plainText = notePlainText(title, blocks)
      await ctx.db.insert(searchIndex).values({
        id:         uuidv7(),
        projectId:  ctx.session.projectId,
        objectType: 'document',
        objectId:   doc.id,
        plainText,
        updatedAt:  now,
      }).onConflictDoUpdate({
        target: [searchIndex.projectId, searchIndex.objectType, searchIndex.objectId],
        set:    { plainText, updatedAt: now },
      })
      return { id: doc.id }
    }),

  restore: authed
    .input(z.object({
      id:         z.string().uuid(),
      revisionId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertWrite(ctx)
      const doc = await loadDocument(ctx, input.id)
      const [revision] = await ctx.db
        .select({ id: documentRevisions.id, blobId: documentRevisions.blobId })
        .from(documentRevisions)
        .where(and(
          eq(documentRevisions.id, input.revisionId),
          eq(documentRevisions.documentId, doc.id),
        ))
        .limit(1)
      if (!revision) throw new TRPCError({ code: 'NOT_FOUND' })

      const now = new Date()
      await ctx.db.insert(documentRevisions).values({
        id:         uuidv7(),
        projectId:  ctx.session.projectId,
        documentId: doc.id,
        blobId:     revision.blobId,
        createdBy:  ctx.session.userId,
        createdAt:  now,
      })
      await retainBlob(ctx.db, revision.blobId)
      await ctx.db.update(documents).set({ updatedAt: now }).where(eq(documents.id, doc.id))
      await ctx.db.insert(auditLog).values({
        id:         uuidv7(),
        projectId:  ctx.session.projectId,
        actorId:    ctx.session.userId,
        action:     'note.restore',
        objectType: 'document',
        objectId:   doc.id,
        after:      { revisionId: revision.id },
      })
      return { id: doc.id }
    }),
})
