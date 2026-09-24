import multipart from '@fastify/multipart'
import { and, eq, isNull, sql } from 'drizzle-orm'
import type { FastifyInstance } from 'fastify'
import { auditLog, blobs, can, files, type DB } from '@twork/db'
import type { StorageClient } from '@twork/storage'
import { uuidv7 } from 'uuidv7'
import { createContext } from './context.js'
import { cleanFileName } from './file-name.js'
import { siblingNameTaken } from './files-shared.js'

const MAX_BYTES = 100 * 1024 * 1024

export async function fileRoutes(app: FastifyInstance, db: DB, storage: StorageClient) {
  await app.register(async scope => {
    await scope.register(multipart, {
      limits: { fileSize: MAX_BYTES, files: 1, fields: 4 },
    })
    scope.post('/files/upload', async (req, reply) => {
      const ctx = await createContext({ req }, db, storage)
      const session = ctx.session
      if (!session) return reply.status(401).send({ error: 'unauthorized' })

      const allowed = await can(session.userId, 'write', {
        type: 'project', id: session.projectId, projectId: session.projectId,
      }, db)
      if (!allowed) return reply.status(403).send({ error: 'forbidden' })

      let parentId: string | null = null
      let filename = ''
      let contentType = 'application/octet-stream'
      let body: Buffer | null = null
      for await (const part of req.parts()) {
        if (part.type === 'file') {
          filename = part.filename
          contentType = part.mimetype || contentType
          body = await part.toBuffer()
        } else if (part.fieldname === 'parentId') {
          const value = String(part.value).trim()
          parentId = value.length > 0 ? value : null
        }
      }
      if (!body || body.length === 0) return reply.status(400).send({ error: 'Choose a file.' })
      const name = cleanFileName(filename)
      if (!name) return reply.status(400).send({ error: 'Use a file name without slashes, up to 180 characters.' })
      if (parentId && !/^[0-9a-f-]{36}$/i.test(parentId)) {
        return reply.status(400).send({ error: 'Folder not found.' })
      }

      if (parentId) {
        const [folder] = await db
          .select({ id: files.id })
          .from(files)
          .where(and(
            eq(files.id, parentId),
            eq(files.projectId, session.projectId),
            eq(files.isFolder, true),
            isNull(files.deletedAt),
          ))
          .limit(1)
        if (!folder) return reply.status(404).send({ error: 'Folder not found.' })
      }

      const taken = await siblingNameTaken(db, session.projectId, parentId, name)
      if (taken) return reply.status(409).send({ error: 'That name is already in this folder.' })

      const meta = await storage.put(body, contentType, session.projectId)
      const blobId = await upsertBlob(db, session.projectId, meta)
      const id = uuidv7()
      await db.transaction(async tx => {
        await tx.insert(files).values({
          id,
          projectId: session.projectId,
          parentId,
          name,
          isFolder: false,
          blobId,
          createdBy: session.userId,
        })
        await tx.update(blobs)
          .set({ refCount: sql`${blobs.refCount} + 1`, updatedAt: new Date() })
          .where(eq(blobs.id, blobId))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  session.projectId,
          actorId:    session.userId,
          action:     'file.upload',
          objectType: 'file',
          objectId:   id,
          after:      { name, blobId },
        })
      })
      return { id }
    })
  })

  app.get<{ Params: { id: string } }>('/files/download/:id', async (req, reply) => {
    const ctx = await createContext({ req }, db, storage)
    if (!ctx.session) return reply.status(401).send({ error: 'unauthorized' })
    const id = req.params.id
    if (!/^[0-9a-f-]{36}$/i.test(id)) return reply.status(404).send({ error: 'not found' })

    const [row] = await db
      .select({
        id:          files.id,
        name:        files.name,
        isFolder:    files.isFolder,
        contentType: blobs.contentType,
        storageKey:  blobs.storageKey,
      })
      .from(files)
      .leftJoin(blobs, eq(blobs.id, files.blobId))
      .where(and(
        eq(files.id, id),
        eq(files.projectId, ctx.session.projectId),
        isNull(files.deletedAt),
      ))
      .limit(1)
    if (!row || row.isFolder || !row.storageKey) return reply.status(404).send({ error: 'not found' })
    const allowed = await can(ctx.session.userId, 'read', {
      type: 'file', id: row.id, projectId: ctx.session.projectId,
    }, db)
    if (!allowed) return reply.status(403).send({ error: 'forbidden' })

    const type = row.contentType || 'application/octet-stream'
    const inline = type.startsWith('image/') || type === 'application/pdf'
    const filename = row.name.replace(/["\r\n]/g, '')
    const stream = await storage.get(row.storageKey)
    reply.header('Content-Type', type)
    reply.header('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`)
    reply.header('Cache-Control', 'private, max-age=0')
    return reply.send(stream)
  })
}

async function upsertBlob(
  db: DB,
  projectId: string,
  meta: { sha256: string; sizeBytes: number; contentType: string; storageKey: string },
): Promise<string> {
  const inserted = await db.insert(blobs).values({
    id:          uuidv7(),
    projectId,
    sha256:      meta.sha256,
    sizeBytes:   meta.sizeBytes,
    contentType: meta.contentType,
    storageKey:  meta.storageKey,
    refCount:    0,
  }).onConflictDoNothing({ target: [blobs.projectId, blobs.sha256] }).returning({ id: blobs.id })
  if (inserted[0]?.id) return inserted[0].id
  const [existing] = await db
    .select({ id: blobs.id })
    .from(blobs)
    .where(and(eq(blobs.projectId, projectId), eq(blobs.sha256, meta.sha256)))
    .limit(1)
  if (!existing) throw new Error('blob row missing after upload')
  return existing.id
}
