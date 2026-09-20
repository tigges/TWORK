export { LlmAdapter } from './types.js'
export type { LlmProvider, LlmMessage, LlmCompleteParams, LlmCompleteResult, LlmEmbedParams, LlmEmbedResult, LlmClassifyParams, LlmClassifyResult } from './types.js'
export { OpenAIProvider } from './providers/openai.js'
export { AnthropicProvider } from './providers/anthropic.js'
export { OllamaProvider, GroqProvider } from './providers/ollama.js'

import { LlmAdapter } from './types.js'
import { OpenAIProvider } from './providers/openai.js'
import { AnthropicProvider } from './providers/anthropic.js'
import { GroqProvider, OllamaProvider } from './providers/ollama.js'

/** Instantiate the appropriate provider based on available environment variables. */
export function createLlmAdapter(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): LlmAdapter {
  if (env['OPENAI_API_KEY']) return new LlmAdapter(new OpenAIProvider(env['OPENAI_API_KEY']), env['OPENAI_MODEL'])
  if (env['ANTHROPIC_API_KEY']) return new LlmAdapter(new AnthropicProvider(env['ANTHROPIC_API_KEY']), env['ANTHROPIC_MODEL'])
  if (env['GROQ_API_KEY']) return new LlmAdapter(new GroqProvider(env['GROQ_API_KEY']), env['GROQ_MODEL'] ?? 'llama-3.1-8b-instant')
  return new LlmAdapter(new OllamaProvider(env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434'), env['OLLAMA_MODEL'] ?? 'llama3.2')
}
