import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import * as os from 'node:os'
import * as http from 'node:http'

const prisma = new PrismaClient()

function dockerRequest(path: string): Promise<unknown> {
  return new Promise((resolve) => {
    const req = http.request(
      { socketPath: '/var/run/docker.sock', path, method: 'GET' },
      (res) => {
        let body = ''
        res.on('data', (chunk: Buffer) => { body += chunk.toString() })
        res.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve(null) } })
      },
    )
    req.on('error', () => resolve(null))
    req.setTimeout(3000, () => { req.destroy(); resolve(null) })
    req.end()
  })
}

async function pingDb() {
  const t0 = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch {
    return { ok: false, latencyMs: -1 }
  }
}

async function pingRedis() {
  const t0 = Date.now()
  try {
    const ioredis = await import('ioredis')
    const IORedis = ioredis.default ?? (ioredis as unknown as new (url: string, opts: object) => import('ioredis').Redis)
    const r = new (IORedis as unknown as new (url: string, opts: object) => import('ioredis').Redis)(
      process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      { connectTimeout: 2000, lazyConnect: true },
    )
    await (r as import('ioredis').Redis & { connect(): Promise<void> }).connect()
    await r.ping()
    r.disconnect()
    return { ok: true, latencyMs: Date.now() - t0 }
  } catch {
    return { ok: false, latencyMs: -1 }
  }
}

export async function systemRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate)

  app.get('/status', async () => {
    const [db, redis, rawContainers] = await Promise.all([
      pingDb(),
      pingRedis(),
      dockerRequest('/containers/json?all=1'),
    ])

    const containers = Array.isArray(rawContainers)
      ? (rawContainers as Array<Record<string, unknown>>).map((c) => ({
          id: String(c['Id'] ?? '').slice(0, 12),
          name: (Array.isArray(c['Names']) && typeof c['Names'][0] === 'string')
            ? (c['Names'][0] as string).replace('/', '')
            : 'unknown',
          image: String(c['Image'] ?? ''),
          state: String(c['State'] ?? 'unknown'),
          status: String(c['Status'] ?? ''),
          created: c['Created'] as number | undefined,
        }))
      : []

    const [sources, totalChunks] = await Promise.all([
      prisma.knowledgeSource.findMany({
        select: { id: true, name: true, lastSyncAt: true, _count: { select: { documents: true } } },
      }).catch(() => []),
      prisma.documentChunk.count().catch(() => 0),
    ])

    return {
      data: {
        services: { database: db, redis },
        containers,
        rag: {
          sources: sources.length,
          documents: (sources as Array<{ _count: { documents: number } }>)
            .reduce((s, x) => s + x._count.documents, 0),
          chunks: totalChunks,
          sourceList: sources,
        },
        system: {
          platform: os.platform(),
          uptime: Math.round(os.uptime()),
          nodeVersion: process.version,
          cpuCount: os.cpus().length,
          totalMemMb: Math.round(os.totalmem() / 1024 / 1024),
          freeMemMb: Math.round(os.freemem() / 1024 / 1024),
          usedMemPct: Math.round((1 - os.freemem() / os.totalmem()) * 100),
        },
        ts: new Date().toISOString(),
      },
    }
  })
}
