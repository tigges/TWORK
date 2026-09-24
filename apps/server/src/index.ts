import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import ws from '@fastify/websocket'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import Fastify from 'fastify'
import { createDb, runMigrations } from '@twork/db'
import { StorageClient } from '@twork/storage'
import { authRoutes } from './auth.js'
import { createContext } from './context.js'
import { mailInboundRoutes } from './mail-inbound.js'
import { appRouter } from './router.js'

export type { AppRouter } from './router.js'

const PORT     = Number(process.env['PORT'] ?? 3001)
const HOST     = process.env['HOST'] ?? '0.0.0.0'
const DB_URL   = process.env['DATABASE_URL'] ?? 'postgresql://twork:twork@localhost:5432/twork'
const ORIGIN   = process.env['PUBLIC_URL']   ?? 'http://localhost:3000'
const RP_ID    = process.env['RP_ID']        ?? 'localhost'
const RP_NAME  = process.env['RP_NAME']      ?? 'TWork'

const S3_ENDPOINT   = process.env['S3_ENDPOINT']   ?? 'http://localhost:9000'
const S3_REGION     = process.env['S3_REGION']     ?? 'us-east-1'
const S3_BUCKET     = process.env['S3_BUCKET']     ?? 'twork'
const S3_ACCESS_KEY = process.env['S3_ACCESS_KEY'] ?? 'minioadmin'
const S3_SECRET_KEY = process.env['S3_SECRET_KEY'] ?? 'minioadmin'

async function main() {
  console.log('[startup] running migrations…')
  await runMigrations(DB_URL)
  console.log('[startup] migrations complete')

  const db      = createDb(DB_URL)
  const storage = new StorageClient({
    endpoint:  S3_ENDPOINT,
    region:    S3_REGION,
    bucket:    S3_BUCKET,
    accessKey: S3_ACCESS_KEY,
    secretKey: S3_SECRET_KEY,
  })

  const app = Fastify({ logger: { level: 'info' } })

  await app.register(cookie)
  await app.register(cors, { origin: ORIGIN, credentials: true })
  await app.register(ws)

  authRoutes(app, db, { rpId: RP_ID, rpName: RP_NAME, origin: ORIGIN })
  await mailInboundRoutes(app, db, storage)

  await app.register(fastifyTRPCPlugin, {
    prefix:      '/trpc',
    useWSS:      true,
    trpcOptions: {
      router:        appRouter,
      createContext: (opts: Parameters<typeof createContext>[0]) =>
        createContext(opts, db, storage),
    },
  })

  const webRoot = join(process.cwd(), 'apps/web/dist')
  if (existsSync(join(webRoot, 'index.html'))) {
    await app.register(fastifyStatic, { root: webRoot })
    app.setNotFoundHandler((req, reply) => {
      if (req.method === 'GET' || req.method === 'HEAD') {
        return reply.sendFile('index.html')
      }
      return reply.status(404).send({ error: 'not found' })
    })
  }

  await app.listen({ port: PORT, host: HOST })
  console.log(`[server] listening on ${HOST}:${PORT}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
