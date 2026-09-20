// ── Core types ────────────────────────────────────────────────────────────────
export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LlmCompleteParams {
  messages: LlmMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  /** When true, onChunk is called for each streaming token instead of buffering. */
  stream?: boolean
  /** Called for each token chunk when stream=true. */
  onChunk?: (chunk: string) => void
}

export interface LlmCompleteResult {
  content: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
}

export interface LlmEmbedParams {
  texts: string[]
  model?: string
}

export interface LlmEmbedResult {
  embeddings: number[][]
  model: string
}

export interface LlmClassifyParams {
  categories: string[]
  examples?: Array<{ text: string; category: string }>
}

export interface LlmClassifyResult {
  category: string
  confidence: number
}

// ── Provider interface ────────────────────────────────────────────────────────
export interface LlmProvider {
  complete(params: LlmCompleteParams): Promise<LlmCompleteResult>
  embed(params: LlmEmbedParams): Promise<LlmEmbedResult>
}

// ── Adapter (wraps provider, adds RAG/classify helpers) ───────────────────────
export class LlmAdapter {
  constructor(private provider: LlmProvider, private defaultModel?: string) {}

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    return this.provider.complete({ model: this.defaultModel, ...params })
  }

  async embed(params: LlmEmbedParams): Promise<LlmEmbedResult> {
    return this.provider.embed({ model: this.defaultModel, ...params })
  }

  async classify(text: string, params: LlmClassifyParams): Promise<LlmClassifyResult> {
    const systemPrompt = [
      'Classify the user\'s message into exactly one of these categories:',
      params.categories.map((c) => `- ${c}`).join('\n'),
      'Respond with JSON: { "category": "<category>", "confidence": <0.0-1.0> }',
      'Do not output anything else.',
    ].join('\n')

    const result = await this.provider.complete({
      messages: [{ role: 'user', content: text }],
      systemPrompt,
      temperature: 0,
      maxTokens: 64,
    })

    try {
      const parsed = JSON.parse(result.content) as { category: string; confidence: number }
      if (params.categories.includes(parsed.category)) return parsed
    } catch { /* fallthrough */ }

    return { category: 'other', confidence: 0.5 }
  }

  async ragComplete(params: {
    question: string
    context: string[]
    systemPrompt?: string
    model?: string
  }): Promise<LlmCompleteResult> {
    const contextBlock = params.context.map((c, i) => `[${i + 1}] ${c}`).join('\n\n')
    const systemPrompt = [
      params.systemPrompt ?? 'You are a helpful assistant.',
      '',
      'Use only the following context to answer the question. If the answer is not in the context, say so.',
      '',
      '--- CONTEXT ---',
      contextBlock,
      '--- END CONTEXT ---',
    ].join('\n')

    return this.provider.complete({
      messages: [{ role: 'user', content: params.question }],
      systemPrompt,
      model: params.model ?? this.defaultModel,
      temperature: 0.2,
    })
  }
}
