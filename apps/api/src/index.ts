import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth.js'
import { meRoutes } from './routes/me.js'
import { botsRoutes } from './routes/bots.js'
import { tenantsRoutes } from './routes/tenants.js'
import { authMiddleware } from './middleware/auth.js'

const PORT = parseInt(process.env['PORT'] ?? '3001', 10)
const HOST = process.env['HOST'] ?? '0.0.0.0'
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:5173'
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

await app.register(cors, {
  origin: FRONTEND_URL,
  credentials: true,
})

await app.register(cookie, {
  secret: JWT_SECRET,
})

await app.register(jwt, {
  secret: JWT_SECRET,
  cookie: { cookieName: 'ybot_token', signed: false },
})

app.decorate('authenticate', authMiddleware)

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

await app.register(authRoutes, { prefix: '/api/v1/auth' })
await app.register(meRoutes, { prefix: '/api/v1/me' })
await app.register(botsRoutes, { prefix: '/api/v1/bots' })
await app.register(tenantsRoutes, { prefix: '/api/v1/tenants' })

try {
  await app.listen({ port: PORT, host: HOST })
  console.log(`API running on http://${HOST}:${PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
