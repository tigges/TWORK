import type { LlmProvider, LlmCompleteParams, LlmCompleteResult, LlmEmbedParams, LlmEmbedResult } from '../types.js'

export class AnthropicProvider implements LlmProvider {
  constructor(private apiKey: string) {}

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    const start = Date.now()
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: params.model ?? 'claude-sonnet-4-5',
        messages: params.messages.filter((m) => m.role !== 'system'),
        system: params.systemPrompt ?? params.messages.find((m) => m.role === 'system')?.content,
        max_tokens: params.maxTokens ?? 2048,
        temperature: params.temperature ?? 0.7,
      }),
    })

    if (!res.ok) throw new Error(`Anthropic error ${res.status}: ${await res.text()}`)

    const data = await res.json() as { content: Array<{ text: string }>; model: string; usage: { input_tokens: number; output_tokens: number } }
    return {
      content: data.content[0]?.text ?? '',
      model: data.model,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
      durationMs: Date.now() - start,
    }
  }

  async embed(_params: LlmEmbedParams): Promise<LlmEmbedResult> {
    throw new Error('Anthropic does not provide embeddings. Use OpenAI or a dedicated embedding service.')
  }
}
