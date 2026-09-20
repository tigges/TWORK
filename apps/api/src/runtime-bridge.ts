/**
 * Runtime bridge: handles inbound messages and runs the SessionMachine.
 *
 * Flow:
 *  1. Inbound user message arrives at POST /conversations/:id/messages
 *  2. This module looks up or creates a Session in Redis
 *  3. Loads the active flow for the conversation's bot
 *  4. Runs SessionMachine.run(session, graph, incomingText)
 *  5. Persists bot reply messages to the DB
 *  6. Broadcasts new messages over WebSocket
 */

import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { SessionMachine } from '@ybot/runtime'
import type { Session, ExecutionServices } from '@ybot/runtime'
import { createLlmAdapter } from '@ybot/llm'

const prisma = new PrismaClient()

let redisClient: import('ioredis').Redis | null = null
async function getRedis(): Promise<import('ioredis').Redis | null> {
  if (redisClient) return redisClient
  try {
    const ioredis = await import('ioredis')
    const Redis = ioredis.default ?? (ioredis as unknown as { new(url: string, opts: object): import('ioredis').Redis })
    redisClient = new (Redis as unknown as new (url: string, opts: object) => import('ioredis').Redis)(
      process.env['REDIS_URL'] ?? 'redis://localhost:6379',
      { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 3000 },
    )
    await (redisClient as import('ioredis').Redis & { connect(): Promise<void> }).connect()
    return redisClient!
  } catch {
    return null
  }
}

const SESSION_TTL = 3600

async function loadSession(conversationId: string): Promise<Session | null> {
  const r = await getRedis()
  if (!r) return null
  try {
    const raw = await r.get(`session:${conversationId}`)
    if (raw) return JSON.parse(raw) as Session
  } catch { /* redis unavailable */ }
  return null
}

async function saveSession(session: Session): Promise<void> {
  const r = await getRedis()
  if (!r) return
  try {
    await r.set(`session:${session.conversationId}`, JSON.stringify(session), 'EX', SESSION_TTL)
  } catch { /* redis unavailable */ }
}

function buildServices(): ExecutionServices {
  const llm = createLlmAdapter()
  return { llm, db: prisma, httpFetch: fetch }
}

/**
 * processInboundMessage — triggered after an inbound user message is saved.
 * Runs the flow and persists bot replies.
 */
export async function processInboundMessage(
  app: FastifyInstance,
  conversationId: string,
  tenantId: string,
  incomingText: string,
): Promise<void> {
  try {
    // Load conversation + bot + active flow
    const convo = await prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        bot: {
          include: {
            flows: {
              include: { versions: { where: { status: 'published' }, orderBy: { version: 'desc' }, take: 1 } },
              take: 1,
            },
          },
        },
      },
    })
    if (!convo?.bot) return

    const flow = convo.bot.flows?.[0]
    const version = flow?.versions?.[0]
    if (!flow || !version?.graph) return

    const graph = version.graph as unknown as import('@ybot/runtime').FlowGraph

    let session = await loadSession(conversationId)
    if (!session || session.status === 'completed' || session.status === 'handed_over') {
      const nodes = (graph.nodes ?? []) as Array<{ id: string; data: { kind: string } }>
      const startNode = nodes.find((n) => n.data.kind === 'trigger_start' || n.data.kind === 'start')
      if (!startNode) return
      session = {
        id: `s_${Date.now()}`,
        conversationId,
        botId: convo.botId ?? convo.bot.id,
        tenantId,
        flowId: flow.id,
        flowVersionId: version.id,
        currentNodeId: startNode.id,
        variables: { flow: { last_user_message: incomingText }, global: {}, contact: {} },
        status: 'running',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    } else {
      // Update last user message for expression evaluation
      session.variables.flow['last_user_message'] = incomingText
    }

    const machine = new SessionMachine(buildServices())
    const result = await machine.run(session, graph, incomingText)

    // Persist bot replies
    for (const msg of result.newMessages) {
      const saved = await prisma.message.create({
        data: { tenantId, conversationId, direction: 'outbound', authorKind: 'bot', content: msg.content },
      })
      // Broadcast via WebSocket
      app.broadcastToTenant(tenantId, { event: 'message.created', data: saved })
    }

    if (result.handover) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'escalated', updatedAt: new Date() } })
    }
    if (result.completed) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { status: 'resolved', updatedAt: new Date() } })
    }

    await saveSession(result.session)
  } catch (err) {
    app.log.error({ err, conversationId }, 'Runtime bridge error')
  }
}
