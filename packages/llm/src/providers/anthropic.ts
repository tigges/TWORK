import type { LlmProvider, LlmCompleteParams, LlmCompleteResult, LlmEmbedParams, LlmEmbedResult } from '../types.js'

export class AnthropicProvider implements LlmProvider {
  constructor(private apiKey: string) {}

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    const start = Date.now()
    const body = {
      model: params.model ?? 'claude-sonnet-4-5',
      messages: params.messages.filter((m) => m.role !== 'system'),
      system: params.systemPrompt ?? params.messages.find((m) => m.role === 'system')?.content,
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature ?? 0.7,
      stream: params.stream ?? false,
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`)

    // ── Streaming path ────────────────────────────────────────────────────────
    if (params.stream && params.onChunk) {
      return this.readStream(res, start, params.onChunk, params.model ?? 'claude-sonnet-4-5')
    }

    // ── Non-streaming path ────────────────────────────────────────────────────
    const data = await res.json() as {
      content: Array<{ text: string }>
      model: string
      usage: { input_tokens: number; output_tokens: number }
    }
    return {
      content: data.content[0]?.text ?? '',
      model: data.model,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      durationMs: Date.now() - start,
    }
  }

  private async readStream(
    res: Response,
    start: number,
    onChunk: (chunk: string) => void,
    modelHint: string,
  ): Promise<LlmCompleteResult> {
    const reader = res.body?.getReader()
    if (!reader) throw new Error('No response body for streaming')

    const decoder = new TextDecoder()
    let fullContent = ''
    let inputTokens = 0
    let outputTokens = 0
    let modelName = modelHint

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]' || data === '') continue

        try {
          const event = JSON.parse(data) as {
            type: string
            delta?: { type: string; text?: string }
            message?: { model: string; usage?: { input_tokens: number; output_tokens: number } }
            usage?: { input_tokens: number; output_tokens: number }
            index?: number
          }

          if (event.type === 'message_start' && event.message) {
            modelName = event.message.model ?? modelHint
            inputTokens = event.message.usage?.input_tokens ?? 0
          } else if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            const text = event.delta.text ?? ''
            if (text) {
              fullContent += text
              onChunk(text)
            }
          } else if (event.type === 'message_delta' && event.usage) {
            outputTokens = event.usage.output_tokens ?? 0
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }

    return {
      content: fullContent,
      model: modelName,
      inputTokens,
      outputTokens,
      durationMs: Date.now() - start,
    }
  }

  async embed(_params: LlmEmbedParams): Promise<LlmEmbedResult> {
    throw new Error('Anthropic does not provide embeddings. Use OpenAI or a dedicated embedding service.')
  }
}
