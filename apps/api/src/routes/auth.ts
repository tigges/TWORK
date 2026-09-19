import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const prisma = new PrismaClient()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  tenantName: z.string().min(2),
  tenantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION', message: 'Invalid input', details: body.error.flatten().fieldErrors } })
    }

    const user = await prisma.user.findFirst({
      where: { email: body.data.email },
      include: { memberships: true },
    })

    if (!user || !user.passwordHash) {
      return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })
    }

    const valid = await bcrypt.compare(body.data.password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } })
    }

    const token = app.jwt.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.memberships[0]?.role ?? 'DEVELOPER',
    }, { expiresIn: '7d' })

    reply.setCookie('ybot_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return {
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          tenantId: user.tenantId,
          role: user.memberships[0]?.role ?? 'DEVELOPER',
        },
      },
    }
  })

  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION', message: 'Invalid input', details: body.error.flatten().fieldErrors } })
    }

    const existing = await prisma.user.findFirst({ where: { email: body.data.email } })
    if (existing) {
      return reply.status(409).send({ error: { code: 'EMAIL_TAKEN', message: 'Email already in use' } })
    }

    const slugExists = await prisma.tenant.findUnique({ where: { slug: body.data.tenantSlug } })
    if (slugExists) {
      return reply.status(409).send({ error: { code: 'SLUG_TAKEN', message: 'Workspace slug already in use' } })
    }

    const passwordHash = await bcrypt.hash(body.data.password, 10)

    const tenant = await prisma.tenant.create({
      data: {
        name: body.data.tenantName,
        slug: body.data.tenantSlug,
        users: {
          create: {
            email: body.data.email,
            displayName: body.data.displayName,
            passwordHash,
            memberships: {
              create: { role: 'ADMIN', tenantId: '' },
            },
          },
        },
      },
      include: { users: { include: { memberships: true } } },
    })

    const user = tenant.users[0]!

    await prisma.membership.updateMany({
      where: { userId: user.id },
      data: { tenantId: tenant.id },
    })

    await prisma.bot.create({
      data: {
        tenantId: tenant.id,
        name: `${body.data.tenantName} Bot`,
        environments: {
          create: [
            { tenantId: tenant.id, kind: 'sandbox', name: 'Sandbox' },
            { tenantId: tenant.id, kind: 'production', name: 'Production' },
          ],
        },
      },
    })

    const token = app.jwt.sign({ sub: user.id, tenantId: tenant.id, role: 'ADMIN' }, { expiresIn: '7d' })

    reply.setCookie('ybot_token', token, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return reply.status(201).send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          tenantId: tenant.id,
          role: 'ADMIN',
        },
      },
    })
  })

  app.post('/logout', async (request, reply) => {
    reply.clearCookie('ybot_token', { path: '/' })
    return { data: { ok: true } }
  })
}
