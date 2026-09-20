import type { LlmProvider, LlmCompleteParams, LlmCompleteResult, LlmEmbedParams, LlmEmbedResult } from '../types.js'

// Ollama — free, self-hosted. Default endpoint: http://localhost:11434
export class OllamaProvider implements LlmProvider {
  constructor(private baseUrl = 'http://localhost:11434') {}

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    const start = Date.now()
    const messages = params.systemPrompt
      ? [{ role: 'system', content: params.systemPrompt }, ...params.messages]
      : params.messages

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model ?? 'llama3.2',
        messages,
        stream: false,
        options: { temperature: params.temperature ?? 0.7, num_predict: params.maxTokens ?? 2048 },
      }),
    })

    if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`)

    const data = await res.json() as { message: { content: string }; model: string; prompt_eval_count?: number; eval_count?: number }
    return {
      content: data.message.content,
      model: data.model,
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
      durationMs: Date.now() - start,
    }
  }

  async embed(params: LlmEmbedParams): Promise<LlmEmbedResult> {
    const embeddings = await Promise.all(params.texts.map(async (text) => {
      const res = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: params.model ?? 'nomic-embed-text', prompt: text }),
      })
      const data = await res.json() as { embedding: number[] }
      return data.embedding
    }))
    return { embeddings, model: params.model ?? 'nomic-embed-text' }
  }
}

// Groq — free tier, very fast. Compatible with OpenAI SDK format
export class GroqProvider implements LlmProvider {
  constructor(private apiKey: string) {}

  async complete(params: LlmCompleteParams): Promise<LlmCompleteResult> {
    const start = Date.now()
    const messages = params.systemPrompt
      ? [{ role: 'system', content: params.systemPrompt }, ...params.messages]
      : params.messages

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: params.model ?? 'llama-3.1-8b-instant',
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 2048,
      }),
    })

    if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`)
    const data = await res.json() as { choices: Array<{ message: { content: string } }>; model: string; usage: { prompt_tokens: number; completion_tokens: number } }
    return {
      content: data.choices[0]?.message.content ?? '',
      model: data.model,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      durationMs: Date.now() - start,
    }
  }

  async embed(_params: LlmEmbedParams): Promise<LlmEmbedResult> {
    throw new Error('Groq does not provide embeddings. Use OpenAI or Ollama.')
  }
}
