import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'

const prisma = new PrismaClient()

interface JwtPayload {
  sub: string
  tenantId: string
  role: string
}

export async function botsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    const { tenantId } = request.user as JwtPayload
    const bots = await prisma.bot.findMany({
      where: { tenantId },
      include: { environments: true },
      orderBy: { createdAt: 'asc' },
    })
    return { data: bots }
  })

  app.get('/:botId', async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { botId } = request.params as { botId: string }

    const bot = await prisma.bot.findFirst({
      where: { id: botId, tenantId },
      include: { environments: true },
    })

    if (!bot) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Bot not found' } })
    return { data: bot }
  })

  app.post('/', async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { name, description } = request.body as { name: string; description?: string }

    const bot = await prisma.bot.create({
      data: {
        tenantId,
        name,
        description,
        environments: {
          create: [
            { tenantId, kind: 'sandbox', name: 'Sandbox' },
            { tenantId, kind: 'production', name: 'Production' },
          ],
        },
      },
      include: { environments: true },
    })

    return reply.status(201).send({ data: bot })
  })
}
