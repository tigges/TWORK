import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { z } from 'zod'

const prisma = new PrismaClient()
type JWT = { sub: string; tenantId: string; role: string }

export async function flowsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  // GET /bots/:botId/flows
  app.get('/:botId/flows', async (request) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const flows = await prisma.flow.findMany({
      where: { botId, tenantId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    })
    return { data: flows }
  })

  // POST /bots/:botId/flows
  app.post('/:botId/flows', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId } = request.params as { botId: string }
    const body = z.object({ name: z.string().min(1), description: z.string().optional(), kind: z.string().default('flow'), tags: z.array(z.string()).default([]) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })

    const flow = await prisma.flow.create({
      data: { ...body.data, tenantId, botId },
    })
    await prisma.flowVersion.create({
      data: { tenantId, flowId: flow.id, version: 1, status: 'draft', graph: { nodes: [], edges: [] }, variables: [] },
    })
    return reply.status(201).send({ data: flow })
  })

  // GET /bots/:botId/flows/:flowId
  app.get('/:botId/flows/:flowId', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, flowId } = request.params as { botId: string; flowId: string }
    const flow = await prisma.flow.findFirst({
      where: { id: flowId, botId, tenantId },
      include: { versions: { orderBy: { version: 'desc' } } },
    })
    if (!flow) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    return { data: flow }
  })

  // PATCH /bots/:botId/flows/:flowId
  app.patch('/:botId/flows/:flowId', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, flowId } = request.params as { botId: string; flowId: string }
    const body = z.object({ name: z.string().optional(), description: z.string().optional(), tags: z.array(z.string()).optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })

    const flow = await prisma.flow.updateMany({
      where: { id: flowId, botId, tenantId },
      data: body.data,
    })
    return { data: flow }
  })

  // DELETE /bots/:botId/flows/:flowId
  app.delete('/:botId/flows/:flowId', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, flowId } = request.params as { botId: string; flowId: string }
    await prisma.flow.deleteMany({ where: { id: flowId, botId, tenantId } })
    return reply.status(204).send()
  })

  // GET /bots/:botId/flows/:flowId/versions/:version/canvas
  app.get('/:botId/flows/:flowId/versions/:version/canvas', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, flowId, version } = request.params as { botId: string; flowId: string; version: string }
    const ver = await prisma.flowVersion.findFirst({
      where: { flowId, version: parseInt(version), flow: { botId, tenantId } },
    })
    if (!ver) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })
    return { data: ver }
  })

  // PUT /bots/:botId/flows/:flowId/versions/:version/canvas  (save graph)
  app.put('/:botId/flows/:flowId/versions/:version/canvas', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, flowId, version } = request.params as { botId: string; flowId: string; version: string }
    const body = z.object({ graph: z.object({ nodes: z.array(z.any()), edges: z.array(z.any()) }), variables: z.array(z.any()).optional() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: { code: 'VALIDATION', details: body.error.flatten() } })

    const ver = await prisma.flowVersion.updateMany({
      where: { flowId, version: parseInt(version), flow: { botId, tenantId } },
      data: { graph: body.data.graph, variables: body.data.variables ?? [] },
    })
    return { data: ver }
  })

  // POST /bots/:botId/flows/:flowId/publish  (publish draft to environment)
  app.post('/:botId/flows/:flowId/publish', async (request, reply) => {
    const { tenantId } = request.user as JWT
    const { botId, flowId } = request.params as { botId: string; flowId: string }
    const { environmentId } = request.body as { environmentId: string }

    const draft = await prisma.flowVersion.findFirst({
      where: { flowId, status: 'draft', flow: { botId, tenantId } },
      orderBy: { version: 'desc' },
    })
    if (!draft) return reply.status(404).send({ error: { code: 'NO_DRAFT', message: 'No draft version found' } })

    const published = await prisma.flowVersion.update({
      where: { id: draft.id },
      data: { status: 'published', environmentId, publishedAt: new Date() },
    })
    await prisma.activity.create({ data: { tenantId, userId: (request.user as JWT).sub, action: 'flow.published', resource: 'flow', resourceId: flowId, metadata: { version: draft.version, environmentId } } })
    return reply.status(200).send({ data: published })
  })
}
