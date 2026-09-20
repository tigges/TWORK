import type { FastifyInstance, FastifyRequest } from 'fastify'

// Track connected clients per tenant
const clients = new Map<string, Set<{ send(data: string): void; readyState: number; on(event: string, cb: (data: Buffer | string) => void): void }>>();

type WsClient = { send(data: string): void; readyState: number; on(event: string, cb: (data: Buffer | string) => void): void }
const WS_OPEN = 1

export function broadcastToTenant(tenantId: string, event: object) {
  const sockets = clients.get(tenantId) ?? new Set()
  const payload = JSON.stringify(event)
  for (const ws of sockets) {
    if (ws.readyState === WS_OPEN) ws.send(payload)
  }
}

export async function wsRoutes(app: FastifyInstance) {
  if (!('websocket' in app)) {
    console.warn('⚠️  @fastify/websocket not registered — skipping WS routes')
    return
  }

  // @ts-ignore — websocket plugin type
  app.get('/ws', { websocket: true }, (connection: { socket: WsClient }, request: FastifyRequest) => {
    const socket = connection.socket
    const token = (request.query as Record<string, string>)['token']
    let tenantId = ''

    try {
      const decoded = app.jwt.verify<{ tenantId: string }>(token ?? '')
      tenantId = decoded.tenantId
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }))
      return
    }

    if (!clients.has(tenantId)) clients.set(tenantId, new Set())
    clients.get(tenantId)!.add(socket)

    socket.send(JSON.stringify({ type: 'connected', tenantId }))

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string }
        if (msg.type === 'ping') socket.send(JSON.stringify({ type: 'pong' }))
      } catch { /* ignore */ }
    })

    socket.on('close', () => {
      clients.get(tenantId)?.delete(socket)
    })
  })
}
