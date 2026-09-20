import type { NodeContext, NodeResult } from '../types.js'
import { interpolate } from '../utils.js'

// ── trigger_start ────────────────────────────────────────────────────────────
export async function executeTriggerStart(_ctx: NodeContext): Promise<NodeResult> {
  return { output: {} }
}

// ── send_message ─────────────────────────────────────────────────────────────
export async function executeSendMessage(ctx: NodeContext): Promise<NodeResult> {
  const { config, session } = ctx
  const text = interpolate(String(config['text'] ?? ''), {
    ...session.variables.flow,
    ...session.variables.global,
    contact: session.variables.contact,
  })
  return {
    output: { sent: true },
    newMessages: [{ direction: 'outbound', content: { text } }],
  }
}

// ── ask_question ─────────────────────────────────────────────────────────────
export async function executeAskQuestion(ctx: NodeContext): Promise<NodeResult> {
  const { config, session } = ctx
  const question = interpolate(String(config['question'] ?? ''), {
    ...session.variables.flow,
    contact: session.variables.contact,
  })
  return {
    output: {},
    newMessages: [{ direction: 'outbound', content: { text: question } }],
    waitForInput: {
      variable: String(config['variable'] ?? 'answer'),
      type: String(config['validate'] ?? 'text'),
      choices: config['choices'] as string[] | undefined,
    },
  }
}

// ── set_variable ──────────────────────────────────────────────────────────────
export async function executeSetVariable(ctx: NodeContext): Promise<NodeResult> {
  const { config, session } = ctx
  const variable = String(config['variable'] ?? '_')
  const raw = String(config['value'] ?? '')
  const value = interpolate(raw, { ...session.variables.flow, contact: session.variables.contact })
  return { output: { [variable]: value } }
}

// ── condition ─────────────────────────────────────────────────────────────────
export async function executeCondition(ctx: NodeContext): Promise<NodeResult> {
  const { config, session } = ctx
  const conditions = (config['conditions'] as Array<{ field: string; operator: string; value: string }>) ?? []
  const vars = { ...session.variables.flow, ...session.variables.global, contact: session.variables.contact }

  const met = conditions.every((c) => {
    const actual = String((vars as Record<string, unknown>)[c.field] ?? '')
    switch (c.operator) {
      case 'equals':    return actual === c.value
      case 'not_equals': return actual !== c.value
      case 'contains':  return actual.includes(c.value)
      case 'is_set':    return actual !== '' && actual !== 'undefined'
      default:          return false
    }
  })

  return { output: { result: met ? 'yes' : 'no' }, nextNodeId: met ? 'yes' : 'no' }
}

// ── http_request ──────────────────────────────────────────────────────────────
export async function executeHttpRequest(ctx: NodeContext): Promise<NodeResult> {
  const { config, session, services } = ctx
  const url = interpolate(String(config['url'] ?? ''), { ...session.variables.flow, contact: session.variables.contact })
  const method = String(config['method'] ?? 'GET')

  try {
    const res = await services.httpFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...((config['headers'] as Record<string, string>) ?? {}) },
      ...(method !== 'GET' && config['body'] ? { body: JSON.stringify(config['body']) } : {}),
    })
    const data = await res.json().catch(() => ({}))
    return { output: { status: res.status, data, ok: res.ok } }
  } catch (err) {
    return { output: { status: 0, ok: false }, error: String(err) }
  }
}

// ── classify_intent ───────────────────────────────────────────────────────────
export async function executeClassifyIntent(ctx: NodeContext): Promise<NodeResult> {
  const { session, services } = ctx
  const lastMsg = String((session.variables.flow['_last_user_message'] as string | undefined) ?? '')
  if (!lastMsg) return { output: { intent: 'unknown', confidence: 0 } }

  const result = await services.llm.classify(lastMsg, {
    categories: ['order_status', 'return_request', 'billing_query', 'password_reset', 'greeting', 'escalate_to_agent', 'other'],
  })
  return { output: { intent: result.category, confidence: result.confidence } }
}

// ── handover ──────────────────────────────────────────────────────────────────
export async function executeHandover(ctx: NodeContext): Promise<NodeResult> {
  const { config } = ctx
  return {
    output: { handed_over: true },
    handover: { team: String(config['team'] ?? 'support'), priority: String(config['priority'] ?? 'medium'), note: String(config['note'] ?? '') },
  }
}

// ── create_ticket ─────────────────────────────────────────────────────────────
export async function executeCreateTicket(ctx: NodeContext): Promise<NodeResult> {
  const { config, session } = ctx
  const subject = interpolate(String(config['subject'] ?? 'Support request'), { ...session.variables.flow, contact: session.variables.contact })
  // Actual ticket creation happens in the session runner after this returns
  return { output: { ticket_created: true, subject } }
}

// ── end_flow ──────────────────────────────────────────────────────────────────
export async function executeEndFlow(_ctx: NodeContext): Promise<NodeResult> {
  return { output: { completed: true } }
}

// ── search_knowledge ──────────────────────────────────────────────────────────
export async function executeSearchKnowledge(ctx: NodeContext): Promise<NodeResult> {
  const { config, session, services } = ctx
  const query = interpolate(String(config['query'] ?? session.variables.flow['last_user_message'] ?? ''), {
    ...session.variables.flow,
    contact: session.variables.contact,
  })
  try {
    // pgvector RAG query via the db service (requires vector extension and embedding column)
    const results = await services.db.$queryRawUnsafe<Array<{ id: string; content: string; similarity: number }>>(
      `SELECT id, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM "DocumentChunk"
       WHERE tenant_id = $2
       ORDER BY embedding <=> $1::vector
       LIMIT 3`,
      JSON.stringify((await services.llm.embed({ texts: [query] })).embeddings[0] ?? []),
      session.tenantId,
    )
    if (results.length === 0) {
      const fallback = String(config['fallback'] ?? "I'm sorry, I couldn't find an answer to that. Let me connect you with an agent.")
      return { output: { answer: fallback, sources: [] }, newMessages: [{ direction: 'outbound', content: { text: fallback } }] }
    }
    const answer = results[0]!.content
    return { output: { answer, sources: results }, newMessages: [{ direction: 'outbound', content: { text: answer } }] }
  } catch {
    const fallback = String(config['fallback'] ?? "I'm sorry, I couldn't find an answer right now.")
    return { output: { answer: fallback, sources: [] }, newMessages: [{ direction: 'outbound', content: { text: fallback } }] }
  }
}

// ── llm_generate ──────────────────────────────────────────────────────────────
export async function executeLlmGenerate(ctx: NodeContext): Promise<NodeResult> {
  const { config, session, services } = ctx
  const systemPrompt = String(config['systemPrompt'] ?? 'You are a helpful assistant.')
  const prompt = interpolate(String(config['prompt'] ?? '{{flow.last_user_message}}'), {
    ...session.variables.flow,
    contact: session.variables.contact,
  })
  try {
    const response = await services.llm.complete({ messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ] })
    const text = response.content ?? "I'm sorry, I couldn't generate a response."
    return { output: { generated: text }, newMessages: [{ direction: 'outbound', content: { text } }] }
  } catch {
    return { output: { generated: '' }, newMessages: [{ direction: 'outbound', content: { text: "I'm having trouble right now. Let me get a human agent." } }] }
  }
}
