import type { FastifyInstance } from 'fastify'
import { and, eq, isNull } from 'drizzle-orm'
import { can, mailMessages, readMessageFiles, type DB } from '@twork/db'
import type { StorageClient } from '@twork/storage'
import { readStoredBlob } from './blob-store.js'
import { createContext } from './context.js'

export async function mailFileRoutes(app: FastifyInstance, db: DB, storage: StorageClient) {
  app.get('/mail/files/:id/:index', async (req, reply) => {
    const ctx = await createContext({ req }, db, storage)
    if (!ctx.session) return reply.status(401).send({ error: 'unauthorized' })
    const { id, index } = req.params as { id: string; index: string }
    if (!/^[0-9a-f-]{36}$/i.test(id) || !/^\d+$/.test(index)) {
      return reply.status(404).send({ error: 'not found' })
    }
    const [row] = await db
      .select({ id: mailMessages.id, rawBlobId: mailMessages.rawBlobId })
      .from(mailMessages)
      .where(and(
        eq(mailMessages.id, id),
        eq(mailMessages.projectId, ctx.session.projectId),
        isNull(mailMessages.deletedAt),
      ))
      .limit(1)
    if (!row) return reply.status(404).send({ error: 'not found' })
    const allowed = await can(ctx.session.userId, 'read', {
      type: 'mail', id: row.id, projectId: ctx.session.projectId,
    }, db)
    if (!allowed) return reply.status(403).send({ error: 'forbidden' })
    const raw = await readStoredBlob(db, storage, row.rawBlobId)
    if (!raw) return reply.status(404).send({ error: 'not found' })
    const files = await readMessageFiles(raw)
    const file = files[Number(index)]
    if (!file) return reply.status(404).send({ error: 'not found' })
    const filename = file.name.replace(/["\r\n]/g, '')
    const inline = file.type.startsWith('image/') || file.type === 'application/pdf'
    reply.header('Content-Type', file.type)
    reply.header('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${filename}"`)
    reply.header('Cache-Control', 'private, max-age=0')
    return reply.send(file.data)
  })
}
