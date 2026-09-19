import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'

const prisma = new PrismaClient()

interface JwtPayload {
  sub: string
  tenantId: string
  role: string
}

export async function meRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/', async (request) => {
    const { sub: userId, tenantId } = request.user as JwtPayload

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    })

    if (!user) {
      return { error: { code: 'NOT_FOUND', message: 'User not found' } }
    }

    return {
      data: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        tenantId,
        role: user.memberships[0]?.role ?? 'DEVELOPER',
      },
    }
  })
}
