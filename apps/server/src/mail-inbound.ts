import multipart from '@fastify/multipart'
import { createHmac } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { DB } from '@twork/db'
import type { StorageClient } from '@twork/storage'
import { primaryMailbox, safeEqual, storeRawMessage } from './mail-store.js'

const MAX_BYTES = 25 * 1024 * 1024

export async function mailInboundRoutes(app: FastifyInstance, db: DB, storage: StorageClient) {
  app.addContentTypeParser(/^message\/rfc822$/i, { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body)
  })
  app.addContentTypeParser('application/x-www-form-urlencoded', { parseAs: 'string' }, (_req, body, done) => {
    const text = typeof body === 'string' ? body : body.toString('utf8')
    const fields: Record<string, string> = {}
    for (const [key, value] of new URLSearchParams(text)) fields[key] = value
    done(null, fields)
  })

  await app.register(multipart, {
    limits: {
      fieldSize: MAX_BYTES,
      fileSize:  MAX_BYTES,
      fields:    30,
      files:     5,
    },
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

  // Mailgun posts the original message when the URL ends in /mime.
  const mailgun = async (req: FastifyRequest, reply: FastifyReply) => {
    const signingKey = process.env['MAILGUN_SIGNING_KEY']
    if (!signingKey) return reply.status(503).send({ error: 'mailgun signing key is not set' })

    const fields = await mailgunFields(req)
    if (!verifyMailgun(signingKey, fields['timestamp'], fields['token'], fields['signature'])) {
      return reply.status(401).send({ error: 'invalid signature' })
    }
    const rawMime = fields['body-mime']
    if (!rawMime) return reply.status(400).send({ error: 'body-mime is required' })

    const owner = await primaryMailbox(db)
    if (!owner) return reply.status(503).send({ error: 'no mailbox' })

    const id = await storeRawMessage(db, storage, {
      projectId: owner.projectId,
      userId:    owner.userId,
      direction: 'inbound',
      raw:       Buffer.from(rawMime, 'utf8'),
    })
    return { id }
  }

  app.post('/mail/inbound/mailgun', { bodyLimit: MAX_BYTES }, mailgun)
  app.post('/mail/inbound/mailgun/mime', { bodyLimit: MAX_BYTES }, mailgun)
}

async function mailgunFields(req: FastifyRequest): Promise<Record<string, string>> {
  const contentType = String(req.headers['content-type'] ?? '')
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = req.body
    if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
      return body as Record<string, string>
    }
  }
  const fields: Record<string, string> = {}
  for await (const part of req.parts()) {
    if (part.type === 'file') fields[part.fieldname] = (await part.toBuffer()).toString('utf8')
    else fields[part.fieldname] = String(part.value)
  }
  return fields
}

function verifyMailgun(
  key:       string,
  timestamp: string | undefined,
  token:     string | undefined,
  signature: string | undefined,
): boolean {
  if (!timestamp || !token || !signature) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 15 * 60) return false
  const expected = createHmac('sha256', key).update(timestamp + token).digest('hex')
  return safeEqual(expected, signature)
}
