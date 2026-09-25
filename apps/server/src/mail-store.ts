import { timingSafeEqual } from 'node:crypto'
import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { DB } from '@twork/db'
import { applyParsedMail, auditLog, grants, mailMessages, users } from '@twork/db'
import { buildRfc5322 } from './mail-send.js'
import { ensureBlob, retainBlob } from './blob-store.js'

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
  const blobId = await ensureBlob(db, storage, input.projectId, input.raw, 'message/rfc822')

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
      await retainBlob(tx as unknown as DB, blobId)
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

/** Keep an unsent message. A later save replaces the raw bytes on the same row. */
export async function saveDraftMessage(
  db:      DB,
  storage: BlobStore,
  input: {
    projectId:   string
    userId:      string
    fromName:    string
    fromAddress: string
    id?:         string
    to:          string
    cc:          string[]
    bcc:         string[]
    subject:     string
    text:        string
    files?:      { name: string; type: string; data: Buffer }[]
  },
): Promise<string> {
  const raw = buildRfc5322({
    fromName:    input.fromName,
    fromAddress: input.fromAddress,
    to:          input.to,
    cc:          input.cc,
    bcc:         input.bcc,
    subject:     input.subject,
    text:        input.text,
    ...(input.files && input.files.length > 0 ? { files: input.files } : {}),
  })

  if (!input.id) {
    const blobId = await ensureBlob(db, storage, input.projectId, raw, 'message/rfc822')
    const messageId = uuidv7()
    await db.transaction(async tx => {
      await tx.insert(mailMessages).values({
        id:          messageId,
        projectId:   input.projectId,
        userId:      input.userId,
        rawBlobId:   blobId,
        receivedAt:  new Date(),
        direction:   'outbound',
        flags:       ['draft'],
        labels:      [],
      })
      await retainBlob(tx as unknown as DB, blobId)
      await tx.insert(auditLog).values({
        id:         uuidv7(),
        projectId:  input.projectId,
        actorId:    input.userId,
        action:     'mail.draft',
        objectType: 'mail',
        objectId:   messageId,
        after:      { rawBlobId: blobId },
      })
    })
    await applyParsedMail(db, messageId, raw)
    await db.update(mailMessages).set({ flags: ['draft'] }).where(eq(mailMessages.id, messageId))
    return messageId
  }

  const [row] = await db
    .select({ id: mailMessages.id, flags: mailMessages.flags })
    .from(mailMessages)
    .where(and(
      eq(mailMessages.id, input.id),
      eq(mailMessages.projectId, input.projectId),
      eq(mailMessages.userId, input.userId),
      isNull(mailMessages.deletedAt),
    ))
    .limit(1)
  if (!row || !row.flags.includes('draft')) throw new Error('draft not found')

  const blobId = await ensureBlob(db, storage, input.projectId, raw, 'message/rfc822')
  await db.update(mailMessages).set({
    rawBlobId: blobId,
    parsedAt:  null,
    updatedAt: new Date(),
  }).where(eq(mailMessages.id, row.id))
  await retainBlob(db, blobId)
  await applyParsedMail(db, row.id, raw)
  await db.update(mailMessages).set({
    flags:     ['draft'],
    updatedAt: new Date(),
  }).where(eq(mailMessages.id, row.id))
  return row.id
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
