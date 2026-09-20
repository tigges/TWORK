/**
 * ragSearch — performs pgvector similarity search with graceful fallback.
 *
 * When an embedding provider is available (OpenAI, Ollama, Groq), it embeds
 * the query and runs a cosine-similarity search against document_chunks.
 *
 * When only Anthropic is configured (no embedding support), it falls back to
 * PostgreSQL full-text search using tsvector/tsquery.
 */

import { PrismaClient } from '@ybot/db'
import { createLlmAdapter } from '@ybot/llm'

const prisma = new PrismaClient()

export interface RagChunk {
  id: string
  content: string
  similarity: number
}

const TOP_K = 5

export async function ragSearch(query: string, tenantId: string, botId?: string): Promise<RagChunk[]> {
  const llm = createLlmAdapter()

  // ── Try vector search first ──────────────────────────────────────────────
  try {
    const embedResult = await llm.embed({ texts: [query] })
    const embedding = embedResult.embeddings[0] ?? []
    if (embedding.length === 0) throw new Error('Empty embedding')

    const rows = await prisma.$queryRawUnsafe<RagChunk[]>(
      `SELECT dc.id, dc.content,
              1 - (dc.embedding <=> $1::vector) AS similarity
       FROM   "document_chunks" dc
       JOIN   "documents"       d  ON d.id = dc."documentId"
       JOIN   "knowledge_sources" ks ON ks.id = d."knowledgeSourceId"
       WHERE  dc."tenantId" = $2
         AND  dc.embedding IS NOT NULL
         ${botId ? 'AND ks."botId" = $3' : ''}
       ORDER  BY dc.embedding <=> $1::vector
       LIMIT  ${TOP_K}`,
      JSON.stringify(embedding),
      tenantId,
      ...(botId ? [botId] : []),
    )

    return rows.filter((r) => r.similarity > 0.3)
  } catch {
    // Embedding unavailable (e.g. Anthropic-only) — fall back to full-text search
  }

  // ── Full-text fallback ────────────────────────────────────────────────────
  try {
    const rows = await prisma.$queryRawUnsafe<RagChunk[]>(
      `SELECT dc.id, dc.content,
              ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', $1)) AS similarity
       FROM   "document_chunks" dc
       JOIN   "documents"       d  ON d.id = dc."documentId"
       JOIN   "knowledge_sources" ks ON ks.id = d."knowledgeSourceId"
       WHERE  dc."tenantId" = $2
         AND  to_tsvector('english', dc.content) @@ plainto_tsquery('english', $1)
         ${botId ? 'AND ks."botId" = $3' : ''}
       ORDER  BY similarity DESC
       LIMIT  ${TOP_K}`,
      query,
      tenantId,
      ...(botId ? [botId] : []),
    )

    return rows.filter((r) => r.similarity > 0)
  } catch {
    return []
  }
}
