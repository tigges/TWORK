import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { z } from 'zod'

const prisma = new PrismaClient()
type JWT = { sub: string; tenantId: string; role: string }

export async function campaignsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/:botId/campaigns', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    return { data: await prisma.campaign.findMany({ where: { botId, tenantId }, orderBy: { createdAt: 'desc' } }) }
  })

  app.post('/:botId/campaigns', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ name: z.string().min(1), direction: z.string().default('outbound'), scheduledAt: z.string().optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    return reply.status(201).send({ data: await prisma.campaign.create({ data: { ...body.data, tenantId, botId, scheduledAt: body.data.scheduledAt ? new Date(body.data.scheduledAt) : undefined } }) })
  })

  app.patch('/:botId/campaigns/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    const body = z.object({ name: z.string().optional(), status: z.string().optional(), scheduledAt: z.string().optional() }).parse(request.body)
    return { data: await prisma.campaign.updateMany({ where: { id, botId, tenantId }, data: { ...body, scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined } }) }
  })

  app.delete('/:botId/campaigns/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    await prisma.campaign.deleteMany({ where: { id, botId, tenantId } })
    return reply.status(204).send()
  })
}

export async function templatesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/:botId/templates', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const q = request.query as Record<string, string>
    return { data: await prisma.template.findMany({
      where: { botId, tenantId, ...(q['channel'] ? { channel: q['channel'] } : {}), ...(q['status'] ? { approvalStatus: q['status'] } : {}) },
      orderBy: { createdAt: 'desc' },
    })}
  })

  app.post('/:botId/templates', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ name: z.string().min(1), channel: z.string(), content: z.record(z.any()), variables: z.array(z.string()).default([]), submitForReview: z.boolean().default(false) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })
    const { submitForReview, ...data } = body.data
    return reply.status(201).send({ data: await prisma.template.create({ data: { ...data, tenantId, botId, approvalStatus: submitForReview ? 'pending' : 'draft' } }) })
  })

  app.patch('/:botId/templates/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    const body = z.object({ name: z.string().optional(), content: z.record(z.any()).optional(), approvalStatus: z.string().optional() }).parse(request.body)
    return { data: await prisma.template.updateMany({ where: { id, botId, tenantId }, data: body }) }
  })

  app.delete('/:botId/templates/:id', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, id } = request.params as { botId: string; id: string }
    await prisma.template.deleteMany({ where: { id, botId, tenantId } })
    return reply.status(204).send()
  })
}
