import type { LlmProvider, LlmCompleteParams, LlmCompleteResult, LlmEmbedParams, LlmEmbedResult } from '../types.js'

export class OpenAIProvider implements LlmProvider {
  constructor(private apiKey: string, private baseUrl = 'https://api.openai.com/v1') {}

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    const start = Date.now()
    const messages = params.systemPrompt
      ? [{ role: 'system', content: params.systemPrompt }, ...params.messages]
      : params.messages

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: params.model ?? 'gpt-4o',
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI error ${res.status}: ${err}`)
    }

    const data = await res.json() as { choices: Array<{ message: { content: string } }>; model: string; usage: { prompt_tokens: number; completion_tokens: number } }
    return {
      content: data.choices[0]?.message.content ?? '',
      model: data.model,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      durationMs: Date.now() - start,
    }
  }

  async embed(params: LlmEmbedParams): Promise<LlmEmbedResult> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: params.model ?? 'text-embedding-3-small', input: params.texts }),
    })
    const data = await res.json() as { data: Array<{ embedding: number[] }>; model: string }
    return { embeddings: data.data.map((d) => d.embedding), model: data.model }
  }
}
