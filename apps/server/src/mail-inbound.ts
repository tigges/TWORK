import type { FastifyInstance } from 'fastify'
import type { DB } from '@twork/db'
import type { StorageClient } from '@twork/storage'
import { fetchResendRawMessage, verifyResendWebhook } from './mail-resend.js'
import { primaryMailbox, safeEqual, storeRawMessage } from './mail-store.js'

const MAX_BYTES = 25 * 1024 * 1024

export async function mailInboundRoutes(app: FastifyInstance, db: DB, storage: StorageClient) {
  app.addContentTypeParser(/^message\/rfc822$/i, { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body)
  })
  // Generic inbound: the raw RFC 5322 body, authorized by a shared secret.
  app.post('/mail/inbound', { bodyLimit: MAX_BYTES }, async (req, reply) => {
    const secret = process.env['MAIL_INBOUND_SECRET']
    const header = req.headers.authorization
    if (!secret || !header?.startsWith('Bearer ') || !safeEqual(header.slice(7), secret)) {
      return reply.status(401).send({ error: 'unauthorized' })
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return reply.status(400).send({ error: 'expected a message/rfc822 body' })
    }
    const owner = await primaryMailbox(db)
    if (!owner) return reply.status(503).send({ error: 'no mailbox' })

    const id = await storeRawMessage(db, storage, {
      projectId: owner.projectId,
      userId:    owner.userId,
      direction: 'inbound',
      raw:       req.body,
    })
    return { id }
  })

  // Resend posts a notice. The original message is downloaded after the signature checks out.
  await app.register(async scope => {
    scope.removeContentTypeParser('application/json')
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
      done(null, body)
    })
    scope.post('/mail/inbound/resend', { bodyLimit: MAX_BYTES }, async (req, reply) => {
      const secret = process.env['RESEND_WEBHOOK_SECRET']
      const apiKey = process.env['RESEND_API_KEY']
      if (!secret || !apiKey) return reply.status(503).send({ error: 'resend is not configured' })
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : ''
      const ok = verifyResendWebhook(secret, {
        id:        headerOne(req.headers['svix-id']),
        timestamp: headerOne(req.headers['svix-timestamp']),
        signature: headerOne(req.headers['svix-signature']),
      }, rawBody)
      if (!ok) return reply.status(401).send({ error: 'invalid signature' })

      let event: { type?: string; data?: { email_id?: string } }
      try {
        event = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string } }
      } catch {
        return reply.status(400).send({ error: 'expected json' })
      }
      if (event.type !== 'email.received') return { ok: true }
      const emailId = event.data?.email_id
      if (!emailId) return reply.status(400).send({ error: 'email_id is required' })

      const owner = await primaryMailbox(db)
      if (!owner) return reply.status(503).send({ error: 'no mailbox' })
      const raw = await fetchResendRawMessage(apiKey, emailId)
      const id = await storeRawMessage(db, storage, {
        projectId: owner.projectId,
        userId:    owner.userId,
        direction: 'inbound',
        raw,
      })
      return { id }
    })
  })
}

function headerOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
