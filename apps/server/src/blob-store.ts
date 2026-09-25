import { createHash } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { DB } from '@twork/db'
import { blobs } from '@twork/db'

interface BlobStore {
  put(
    body:        Buffer,
    contentType: string,
    projectId:   string,
  ): Promise<{ sha256: string; sizeBytes: number; contentType: string; storageKey: string }>
}

/** Store bytes once per project and return the blob row id. Does not change refCount. */
export async function ensureBlob(
  db:          DB,
  storage:     BlobStore,
  projectId:   string,
  body:        Buffer,
  contentType: string,
): Promise<string> {
  const meta = await storage.put(body, contentType, projectId)
  const sha = meta.sha256 || createHash('sha256').update(body).digest('hex')
  const inserted = await db.insert(blobs).values({
    id:          uuidv7(),
    projectId,
    sha256:      sha,
    sizeBytes:   meta.sizeBytes,
    contentType,
    storageKey:  meta.storageKey,
    refCount:    0,
  }).onConflictDoNothing({ target: [blobs.projectId, blobs.sha256] }).returning({ id: blobs.id })

  const created = inserted[0]?.id
  if (created) return created

  const [existing] = await db
    .select({ id: blobs.id })
    .from(blobs)
    .where(and(eq(blobs.projectId, projectId), eq(blobs.sha256, sha)))
    .limit(1)
  if (!existing) throw new Error('blob row missing after upload')
  return existing.id
}

export async function retainBlob(db: DB, blobId: string): Promise<void> {
  await db.update(blobs)
    .set({ refCount: sql`${blobs.refCount} + 1`, updatedAt: new Date() })
    .where(eq(blobs.id, blobId))
}
