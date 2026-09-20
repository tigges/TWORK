import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { authRoutes } from './routes/auth.js'
import { meRoutes } from './routes/me.js'
import { botsRoutes } from './routes/bots.js'
import { tenantsRoutes } from './routes/tenants.js'
import { flowsRoutes } from './routes/flows.js'
import { knowledgeRoutes } from './routes/knowledge.js'
import { conversationsRoutes, ticketsRoutes, contactsRoutes } from './routes/inbox.js'
import { campaignsRoutes, templatesRoutes } from './routes/engage.js'
import { channelsRoutes, webhooksRoutes, teamRoutes, analyticsRoutes, auditRoutes } from './routes/config.js'
import { startKnowledgeSyncWorker } from './workers/knowledge-sync.js'
import { systemRoutes } from './routes/system.js'
import { authMiddleware } from './middleware/auth.js'
import { wsRoutes, broadcastToTenant } from './ws.js'

const PORT = parseInt(process.env['PORT'] ?? '3001', 10)
const HOST = process.env['HOST'] ?? '0.0.0.0'
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:5173'
const JWT_SECRET = process.env['JWT_SECRET'] ?? 'dev-secret-change-me'

const isDev = process.env['NODE_ENV'] !== 'production'

const app = Fastify({
  logger: isDev
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
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

await app.register(websocket)

app.decorate('authenticate', authMiddleware)
// Make broadcastToTenant available on the app instance for runtime-bridge
app.decorate('broadcastToTenant', broadcastToTenant)

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

await app.register(authRoutes, { prefix: '/api/v1/auth' })
await app.register(meRoutes, { prefix: '/api/v1/me' })
await app.register(botsRoutes, { prefix: '/api/v1/bots' })
await app.register(flowsRoutes, { prefix: '/api/v1/bots' })
await app.register(knowledgeRoutes, { prefix: '/api/v1/bots' })
await app.register(campaignsRoutes, { prefix: '/api/v1/bots' })
await app.register(templatesRoutes, { prefix: '/api/v1/bots' })
await app.register(channelsRoutes, { prefix: '/api/v1/bots' })
await app.register(tenantsRoutes, { prefix: '/api/v1/tenants' })
await app.register(conversationsRoutes, { prefix: '/api/v1/conversations' })
await app.register(ticketsRoutes, { prefix: '/api/v1/tickets' })
await app.register(contactsRoutes, { prefix: '/api/v1/contacts' })
await app.register(webhooksRoutes, { prefix: '/api/v1/webhooks' })
await app.register(teamRoutes, { prefix: '/api/v1/team' })
await app.register(analyticsRoutes, { prefix: '/api/v1/analytics' })
await app.register(auditRoutes, { prefix: '/api/v1/audit' })
await app.register(systemRoutes, { prefix: '/api/v1/system' })
await app.register(wsRoutes, { prefix: '' })

try {
  await app.listen({ port: PORT, host: HOST })
  console.log(`API running on http://${HOST}:${PORT}`)
  // Start background workers (non-blocking)
  startKnowledgeSyncWorker().catch(() => {})
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
