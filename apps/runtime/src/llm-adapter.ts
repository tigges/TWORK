import type { LlmAdapter } from './llm-adapter.js'

export interface LlmAdapterShim {
  complete(params: Parameters<LlmAdapter['complete']>[0]): ReturnType<LlmAdapter['complete']>
}

export type { LlmAdapter }
