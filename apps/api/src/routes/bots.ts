import type { FastifyInstance } from 'fastify'
import { PrismaClient } from '@ybot/db'
import { ragSearch } from '../rag.js'
import { createLlmAdapter } from '@ybot/llm'

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

  // POST /bots/:botId/preview-chat — stateless SSE chat for widget test runs
  app.post('/:botId/preview-chat', async (request, reply) => {
    const { tenantId } = request.user as JwtPayload
    const { botId } = request.params as { botId: string }

    const body = request.body as {
      text: string
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
      systemPrompt?: string
    }
    if (!body.text?.trim()) return reply.status(400).send({ error: { code: 'VALIDATION' } })

    const bot = await prisma.bot.findFirst({ where: { id: botId, tenantId } })
    if (!bot) return reply.status(404).send({ error: { code: 'NOT_FOUND' } })

    const chunks = await ragSearch(body.text, tenantId, botId)
    const contextBlock = chunks.length
      ? chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
      : ''

    const systemPrompt = [
      body.systemPrompt ?? `You are a helpful AI assistant for ${bot.name}. Be concise, accurate, and friendly.`,
      ...(contextBlock
        ? [
            '',
            'Use the following knowledge base excerpts to answer the question. If the answer is not covered, acknowledge it politely.',
            '',
            '--- KNOWLEDGE BASE ---',
            contextBlock,
            '--- END ---',
          ]
        : []),
    ].join('\n')

    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.raw.flushHeaders?.()

    const llm = createLlmAdapter()
    let fullContent = ''

    try {
      await llm.complete({
        messages: [
          ...(body.history ?? []),
          { role: 'user', content: body.text },
        ],
        systemPrompt,
        stream: true,
        temperature: 0.3,
        onChunk: (chunk) => {
          fullContent += chunk
          reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
        },
      })
    } catch {
      fullContent = "I'm sorry, I'm having trouble right now. Please try again."
      reply.raw.write(`data: ${JSON.stringify({ type: 'chunk', text: fullContent })}\n\n`)
    }

    reply.raw.write(`data: ${JSON.stringify({ type: 'done', sources: chunks.length })}\n\n`)
    reply.raw.end()
  })
}
