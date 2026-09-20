import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { z } from 'zod'

const prisma = new PrismaClient()
type JWT = { sub: string; tenantId: string; role: string }

export async function knowledgeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // ── Intents ─────────────────────────────────────────────────────────────
  app.get('/:botId/intents', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const intents = await prisma.intent.findMany({ where: { botId, tenantId }, orderBy: { name: 'asc' } })
    return { data: intents }
  })

  app.post('/:botId/intents', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ name: z.string().min(1), description: z.string().optional(), utterances: z.array(z.string()).default([]), responses: z.array(z.any()).default([]) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    const intent = await prisma.intent.create({ data: { ...body.data, tenantId, botId } })
    return reply.status(201).send({ data: intent })
  })

  app.patch('/:botId/intents/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    const body = z.object({ name: z.string().optional(), description: z.string().optional(), utterances: z.array(z.string()).optional(), responses: z.array(z.any()).optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    const intent = await prisma.intent.updateMany({ where: { id, botId, tenantId }, data: body.data })
    return { data: intent }
  })

  app.delete('/:botId/intents/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    await prisma.intent.deleteMany({ where: { id, botId, tenantId } })
    return reply.status(204).send()
  })

  // ── Entities ─────────────────────────────────────────────────────────────
  app.get('/:botId/entities', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    return { data: await prisma.entity.findMany({ where: { botId, tenantId }, orderBy: { name: 'asc' } }) }
  })

  app.post('/:botId/entities', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ name: z.string().min(1), kind: z.string().default('list'), values: z.array(z.any()).default([]) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    return reply.status(201).send({ data: await prisma.entity.create({ data: { ...body.data, tenantId, botId } }) })
  })

  app.patch('/:botId/entities/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    const body = z.object({ name: z.string().optional(), kind: z.string().optional(), values: z.array(z.any()).optional() }).parse(request.body)
    return { data: await prisma.entity.updateMany({ where: { id, botId, tenantId }, data: body }) }
  })

  app.delete('/:botId/entities/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    await prisma.entity.deleteMany({ where: { id, botId, tenantId } })
    return reply.status(204).send()
  })

  // ── FAQs ──────────────────────────────────────────────────────────────────
  app.get('/:botId/faqs', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    return { data: await prisma.faq.findMany({ where: { botId, tenantId }, orderBy: { createdAt: 'desc' } }) }
  })

  app.post('/:botId/faqs', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ question: z.string().min(1), answer: z.string().min(1), tags: z.array(z.string()).default([]) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    return reply.status(201).send({ data: await prisma.faq.create({ data: { ...body.data, tenantId, botId } }) })
  })

  app.patch('/:botId/faqs/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    const body = z.object({ question: z.string().optional(), answer: z.string().optional(), tags: z.array(z.string()).optional() }).parse(request.body)
    return { data: await prisma.faq.updateMany({ where: { id, botId, tenantId }, data: body }) }
  })

  app.delete('/:botId/faqs/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    await prisma.faq.deleteMany({ where: { id, botId, tenantId } })
    return reply.status(204).send()
  })

  // ── Knowledge Sources ─────────────────────────────────────────────────────
  app.get('/:botId/sources', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    return { data: await prisma.knowledgeSource.findMany({ where: { botId, tenantId }, include: { documents: { select: { id: true, status: true } } }, orderBy: { createdAt: 'desc' } }) }
  })

  app.post('/:botId/sources', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ name: z.string().min(1), kind: z.enum(['website', 'file', 'url', 'text']), config: z.record(z.any()).default({}) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    return reply.status(201).send({ data: await prisma.knowledgeSource.create({ data: { ...body.data, tenantId, botId } }) })
  })

  app.delete('/:botId/sources/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    await prisma.knowledgeSource.deleteMany({ where: { id, botId, tenantId } })
    return reply.status(204).send()
  })

  // POST /bots/:botId/sources/:id/sync  (trigger re-index job)
  app.post('/:botId/sources/:id/sync', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    const src = await prisma.knowledgeSource.findFirst({ where: { id, botId, tenantId } })
    if (!src) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    await prisma.knowledgeSource.update({ where: { id }, data: { lastSyncAt: new Date() } })
    // In production: enqueue BullMQ job here
    return { data: { queued: true, sourceId: id } }
  })

  // ── LLM Training Config ───────────────────────────────────────────────────
  app.get('/:botId/training', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const bot = await prisma.bot.findFirst({ where: { id: botId, tenantId } })
    if (!bot) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    return { data: { model: 'gpt-4o', temperature: 0.3, maxTokens: 2048, systemPrompt: 'You are a helpful support assistant for Acme Corp. Be concise, friendly, and professional.' } }
  })

  app.put('/:botId/training', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ model: z.string(), temperature: z.number().min(0).max(2), maxTokens: z.number().optional(), systemPrompt: z.string().optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    await prisma.activity.create({ data: { tenantId, userId: (request.user as JWT).sub, action: 'training.updated', resource: 'bot', resourceId: botId } })
    return { data: { ...body.data, botId } }
  })
}
