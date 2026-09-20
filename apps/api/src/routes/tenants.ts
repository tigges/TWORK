import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'

const prisma = new PrismaClient()

interface JwtPayload {
  sub: string
  tenantId: string
  role: string
}

export async function tenantsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/me', async (request) => {
    const { tenantId } = request.user as JwtPayload
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    return { data: tenant }
  })

  app.get('/me/members', async (request) => {
    const { tenantId } = request.user as JwtPayload
    const members = await prisma.membership.findMany({
      where: { tenantId },
      include: { user: true },
    })
    return {
      data: members.map((m) => ({
        id: m.user.id,
        email: m.user.email,
        displayName: m.user.displayName,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        createdAt: m.user.createdAt,
      })),
    }
  })
}
