import { and, eq, isNull } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import type { DB } from './index.js'
import { parseRfc5322 } from './rfc5322.js'
import { mailMessages, mailThreads, searchIndex } from './schema.js'

/**
 * Fill parsed columns from the raw RFC 5322 bytes.
 * Caller must already have committed the blob and the mail_messages row.
 */
export async function applyParsedMail(db: DB, messageId: string, raw: Buffer): Promise<void> {
  const [message] = await db
    .select()
    .from(mailMessages)
    .where(eq(mailMessages.id, messageId))
    .limit(1)

  if (!message || message.parsedAt) return

  let parsed: Awaited<ReturnType<typeof parseRfc5322>>
  try {
    parsed = await parseRfc5322(raw)
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'parse failed'
    await db.update(mailMessages).set({
      subject:   '(unreadable message)',
      textBody:  reason,
      parsedAt:  new Date(),
      updatedAt: new Date(),
    }).where(eq(mailMessages.id, messageId))
    return
  }

  let threadId = message.threadId
  if (!threadId && parsed.inReplyTo) {
    const [parent] = await db
      .select({ threadId: mailMessages.threadId })
      .from(mailMessages)
      .where(and(
        eq(mailMessages.projectId, message.projectId),
        eq(mailMessages.messageIdHdr, parsed.inReplyTo),
        isNull(mailMessages.deletedAt),
      ))
      .limit(1)
    if (parent?.threadId) threadId = parent.threadId
  }

  if (!threadId) {
    threadId = uuidv7()
    await db.insert(mailThreads).values({
      id:        threadId,
      projectId: message.projectId,
      subject:   parsed.subject || '(no subject)',
    })
  }

  const receivedAt = parsed.date && !Number.isNaN(Date.parse(parsed.date))
    ? new Date(parsed.date)
    : message.receivedAt

  await db.update(mailMessages).set({
    threadId,
    messageIdHdr: parsed.messageId,
    subject:      parsed.subject,
    fromAddress:  parsed.from,
    toAddresses:  parsed.to,
    ccAddresses:  parsed.cc,
    bccAddresses: parsed.bcc,
    textBody:     parsed.text,
    inReplyTo:    parsed.inReplyTo,
    receivedAt,
    parsedAt:     new Date(),
    updatedAt:    new Date(),
  }).where(eq(mailMessages.id, messageId))

  const plainText = [parsed.subject, parsed.from, ...parsed.to, ...parsed.cc, ...parsed.bcc, parsed.text]
    .filter((part): part is string => !!part && part.length > 0)
    .join('\n') || '(empty)'

  await db.insert(searchIndex).values({
    id:         uuidv7(),
    projectId:  message.projectId,
    objectType: 'mail',
    objectId:   messageId,
    plainText,
  }).onConflictDoUpdate({
    target: [searchIndex.projectId, searchIndex.objectType, searchIndex.objectId],
    set:    { plainText, updatedAt: new Date() },
  })
}
