import { createHash, timingSafeEqual } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { DB } from '@twork/db'
import { applyParsedMail, auditLog, blobs, grants, mailMessages, users } from '@twork/db'
interface BlobStore {
  put(
    body:        Buffer,
    contentType: string,
    projectId:   string,
  ): Promise<{ sha256: string; sizeBytes: number; contentType: string; storageKey: string }>
}

/**
 * Persist the complete RFC 5322 message, then parse it.
 * Parsing never runs before the blob row and the message row are committed.
 */
export async function storeRawMessage(
  db:      DB,
  storage: BlobStore,
  input: {
    projectId: string
    userId:    string
    direction: 'inbound' | 'outbound'
    raw:       Buffer
  },
): Promise<string> {
  const meta = await storage.put(input.raw, 'message/rfc822', input.projectId)
  const sha  = meta.sha256 || createHash('sha256').update(input.raw).digest('hex')

  const inserted = await db.insert(blobs).values({
    id:          uuidv7(),
    projectId:   input.projectId,
    sha256:      sha,
    sizeBytes:   meta.sizeBytes,
    contentType: 'message/rfc822',
    storageKey:  meta.storageKey,
    refCount:    0,
  }).onConflictDoNothing({ target: [blobs.projectId, blobs.sha256] }).returning({ id: blobs.id })

  let blobId = inserted[0]?.id
  if (!blobId) {
    const [existing] = await db
      .select({ id: blobs.id })
      .from(blobs)
      .where(and(eq(blobs.projectId, input.projectId), eq(blobs.sha256, sha)))
      .limit(1)
    if (!existing) throw new Error('blob row missing after upload')
    blobId = existing.id
  }

  const [duplicate] = await db
    .select({ id: mailMessages.id })
    .from(mailMessages)
    .where(and(
      eq(mailMessages.userId, input.userId),
      eq(mailMessages.rawBlobId, blobId),
      isNull(mailMessages.deletedAt),
    ))
    .limit(1)
  if (duplicate) return duplicate.id

  const messageId = uuidv7()
  try {
    await db.transaction(async tx => {
      await tx.insert(mailMessages).values({
        id:          messageId,
        projectId:   input.projectId,
        userId:      input.userId,
        rawBlobId:   blobId,
        receivedAt:  new Date(),
        direction:   input.direction,
        flags:       input.direction === 'inbound' ? ['unread'] : [],
        labels:      [],
      })
      await tx.update(blobs)
        .set({ refCount: sql`${blobs.refCount} + 1`, updatedAt: new Date() })
        .where(eq(blobs.id, blobId))
      await tx.insert(auditLog).values({
        id:         uuidv7(),
        projectId:  input.projectId,
        actorId:    input.userId,
        action:     input.direction === 'inbound' ? 'mail.receive' : 'mail.send',
        objectType: 'mail',
        objectId:   messageId,
        after:      { rawBlobId: blobId, direction: input.direction },
      })
    })
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    const [race] = await db
      .select({ id: mailMessages.id })
      .from(mailMessages)
      .where(and(eq(mailMessages.userId, input.userId), eq(mailMessages.rawBlobId, blobId)))
      .limit(1)
    if (!race) throw err
    return race.id
  }

  await applyParsedMail(db, messageId, input.raw)
  return messageId
}

export async function primaryMailbox(db: DB): Promise<{ userId: string; projectId: string } | null> {
  const [row] = await db
    .select({ userId: users.id, projectId: grants.projectId })
    .from(grants)
    .innerJoin(users, eq(users.id, grants.userId))
    .where(and(
      eq(grants.objectType, 'project'),
      eq(grants.role, 'owner'),
      isNull(grants.objectId),
      isNull(grants.deletedAt),
      isNull(users.deletedAt),
    ))
    .limit(1)
  return row ?? null
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505'
}
