import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { z } from 'zod'
import { processInboundMessage } from '../runtime-bridge.js'

const prisma = new PrismaClient()
type JWT = { sub: string; tenantId: string; role: string }

export async function conversationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /conversations  (with filters)
  app.get('/', async (request) => {
    const { tenantId } = request.user as JWT
    const q = request.query as Record<string, string>
    const conversations = await prisma.conversation.findMany({
      where: {
        tenantId,
        ...(q['botId'] ? { botId: q['botId'] } : {}),
        ...(q['status'] ? { status: q['status'] } : {}),
        ...(q['assignedTo'] ? { assignedTo: q['assignedTo'] } : {}),
        ...(q['channelId'] ? { channelId: q['channelId'] } : {}),
      },
      include: {
        contact: true,
        channel: { select: { id: true, name: true, kind: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        labels: { include: { label: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: parseInt(q['limit'] ?? '50'),
      skip: parseInt(q['offset'] ?? '0'),
    })
    return { data: conversations }
  })

  // GET /conversations/:id
  app.get('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const convo = await prisma.conversation.findFirst({
      where: { id, tenantId },
      include: { contact: true, channel: true, messages: { orderBy: { createdAt: 'asc' } }, labels: { include: { label: true } }, tickets: true },
    })
    if (!convo) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    return { data: convo }
  })

  // PATCH /conversations/:id  (assign, resolve, escalate, etc.)
  app.patch('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const body = z.object({
      status: z.enum(['active', 'resolved', 'escalated', 'closed']).optional(),
      assignedTo: z.string().nullable().optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    const convo = await prisma.conversation.updateMany({ where: { id, tenantId }, data: { ...body.data, ...(body.data.status === 'resolved' ? { resolvedAt: new Date() } : {}) } })
    return { data: convo }
  })

  // GET /conversations/:id/messages
  app.get('/:id/messages', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const exists = await prisma.conversation.findFirst({ where: { id, tenantId } })
    if (!exists) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    const messages = await prisma.message.findMany({ where: { conversationId: id, tenantId }, orderBy: { createdAt: 'asc' } })
    return { data: messages }
  })

  // POST /conversations/:id/messages  (agent reply or inbound user message)
  app.post('/:id/messages', async (request, reply) => {
    const { tenantId, sub: userId } = request.user as JWT
    const { id } = request.params as { id: string }
    const body = z.object({
      content: z.object({ text: z.string().min(1) }),
      authorKind: z.enum(['agent', 'bot', 'user']).default('agent'),
      isInternalNote: z.boolean().default(false),
      direction: z.enum(['inbound', 'outbound']).optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })

    const direction = body.data.direction ?? (body.data.authorKind === 'user' ? 'inbound' : 'outbound')
    const msg = await prisma.message.create({
      data: { tenantId, conversationId: id, direction, authorId: userId, authorKind: body.data.authorKind, content: body.data.content },
    })
    await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } })

    // Trigger bot engine for inbound user messages
    if (direction === 'inbound' && body.data.authorKind === 'user') {
      // Fire-and-forget: don't await — respond immediately, bot replies come via WS
      setImmediate(() => processInboundMessage(app, id, tenantId, body.data.content.text).catch(() => {}))
    }

    return reply.status(201).send({ data: msg })
  })

  // POST /conversations/:id/labels
  app.post('/:id/labels', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const { labelId } = request.body as { labelId: string }
    const label = await prisma.label.findFirst({ where: { id: labelId, tenantId } })
    if (!label) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    await prisma.conversationLabel.upsert({ where: { conversationId_labelId: { conversationId: id, labelId } }, create: { conversationId: id, labelId }, update: {} })
    return reply.status(200).send({ data: { ok: true } })
  })

  // DELETE /conversations/:id/labels/:labelId
  app.delete('/:id/labels/:labelId', async (request, reply) => {
    const { id, labelId } = request.params as { id: string; labelId: string }
    await prisma.conversationLabel.delete({ where: { conversationId_labelId: { conversationId: id, labelId } } })
    return reply.status(204).send()
  })
}

export async function ticketsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    const { tenantId } = request.user as JWT
    const q = request.query as Record<string, string>
    return { data: await prisma.ticket.findMany({
      where: { tenantId, ...(q['status'] ? { status: q['status'] } : {}), ...(q['assignedTo'] ? { assignedTo: q['assignedTo'] } : {}) },
      include: { conversation: { include: { contact: true } } },
      orderBy: { createdAt: 'desc' },
    })}
  })

  app.post('/', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const body = z.object({ conversationId: z.string(), subject: z.string().min(1), priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'), assignedTo: z.string().optional(), tags: z.array(z.string()).default([]) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    return reply.status(201).send({ data: await prisma.ticket.create({ data: { ...body.data, tenantId } }) })
  })

  app.patch('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const body = z.object({ status: z.string().optional(), priority: z.string().optional(), assignedTo: z.string().nullable().optional(), tags: z.array(z.string()).optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    const data: Record<string, unknown> = { ...body.data }
    if (body.data.status === 'resolved') data['resolvedAt'] = new Date()
    return { data: await prisma.ticket.updateMany({ where: { id, tenantId }, data }) }
  })

  app.delete('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    await prisma.ticket.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })
}

export async function contactsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    const { tenantId } = request.user as JWT
    const q = request.query as Record<string, string>
    const where: Record<string, unknown> = { tenantId }
    if (q['search']) where['OR'] = [{ displayName: { contains: q['search'], mode: 'insensitive' } }, { email: { contains: q['search'], mode: 'insensitive' } }]
    return { data: await prisma.contact.findMany({ where, include: { _count: { select: { conversations: true } } }, orderBy: { createdAt: 'desc' }, take: parseInt(q['limit'] ?? '100') }) }
  })

  app.post('/', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const body = z.object({ displayName: z.string().min(1), email: z.string().email().optional(), phone: z.string().optional(), metadata: z.record(z.any()).default({}) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    return reply.status(201).send({ data: await prisma.contact.create({ data: { ...body.data, tenantId } }) })
  })

  app.patch('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    const body = z.object({ displayName: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional(), metadata: z.record(z.any()).optional() }).parse(request.body)
    return { data: await prisma.contact.updateMany({ where: { id, tenantId }, data: body }) }
  })

  app.delete('/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { id } = request.params as { id: string }
    await prisma.contact.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })
}
