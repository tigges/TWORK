/**
 * TWork background worker.
 * Same Docker image as the server; CMD overridden in docker-compose.yml.
 *
 * Job queue: pg-boss (PostgreSQL-backed, no Redis dependency).
 *
 * Jobs (stubs — filled in as each module is built):
 *   mail.parse-pending  Parse stored RFC 5322 blobs into mail fields
 *   search.index     Upsert search_index row for a given object
 *   blobs.gc         Decrement ref_count → delete from S3 when it hits 0
 */
import PgBoss from 'pg-boss'
import { and, eq, isNull, lt } from 'drizzle-orm'
import {
  applyParsedMail,
  blobs,
  createDb,
  mailMessages,
  runMigrations,
  webauthnChallenges,
} from '@twork/db'
import { StorageClient } from '@twork/storage'

const DB_URL        = process.env['DATABASE_URL'] ?? 'postgresql://twork:twork@localhost:5432/twork'
const S3_ENDPOINT   = process.env['S3_ENDPOINT']   ?? 'http://localhost:9000'
const S3_REGION     = process.env['S3_REGION']     ?? 'us-east-1'
const S3_BUCKET     = process.env['S3_BUCKET']     ?? 'twork'
const S3_ACCESS_KEY = process.env['S3_ACCESS_KEY'] ?? 'minioadmin'
const S3_SECRET_KEY = process.env['S3_SECRET_KEY'] ?? 'minioadmin'

async function main() {
  console.log('[worker] running migrations…')
  await runMigrations(DB_URL)

  const db = createDb(DB_URL)
  const storage = new StorageClient({
    endpoint:  S3_ENDPOINT,
    region:    S3_REGION,
    bucket:    S3_BUCKET,
    accessKey: S3_ACCESS_KEY,
    secretKey: S3_SECRET_KEY,
  })

  const boss = new PgBoss(DB_URL)
  await boss.start()
  console.log('[worker] pg-boss started')

  // ── mail.parse-pending ──────────────────────────────────────────────────────
  // Backup for messages whose raw blob was stored but not yet parsed.
  const parsePending = async () => {
    const pending = await db
      .select({ id: mailMessages.id, storageKey: blobs.storageKey })
      .from(mailMessages)
      .innerJoin(blobs, eq(blobs.id, mailMessages.rawBlobId))
      .where(and(isNull(mailMessages.parsedAt), isNull(mailMessages.deletedAt)))
      .limit(20)
    for (const row of pending) {
      try {
        const raw = await storage.getBuffer(row.storageKey)
        await applyParsedMail(db, row.id, raw)
        console.log(`[worker] parsed mail ${row.id}`)
      } catch (err) {
        console.error(`[worker] mail parse failed ${row.id}`, err)
      }
    }
  }
  await boss.schedule('mail.parse-pending', '* * * * *')
  await boss.work('mail.parse-pending', async () => { await parsePending() })

  // ── search.index ────────────────────────────────────────────────────────────
  await boss.work<{ projectId: string; objectType: string; objectId: string; text: string }>(
    'search.index',
    async jobs => {
      for (const job of jobs) {
        console.log(`[worker] search.index ${job.data.objectType}/${job.data.objectId} (stub)`)
      }
    },
  )

  // ── blobs.gc ────────────────────────────────────────────────────────────────
  await boss.work<{ blobId: string }>('blobs.gc', async jobs => {
    for (const job of jobs) {
      console.log(`[worker] blobs.gc ${job.data.blobId} (stub)`)
    }
  })

  // ── Scheduled: expire WebAuthn challenges every 5 minutes ──────────────────
  await boss.schedule('webauthn.cleanup', '*/5 * * * *')
  await boss.work('webauthn.cleanup', async () => {
    await db
      .delete(webauthnChallenges)
      .where(lt(webauthnChallenges.expiresAt, new Date()))
    console.log('[worker] webauthn.cleanup complete')
  })

  console.log('[worker] ready — listening for jobs')

  process.on('SIGTERM', async () => {
    console.log('[worker] SIGTERM — shutting down gracefully')
    await boss.stop()
    process.exit(0)
  })
}

main().catch(err => {
  console.error('[worker] fatal:', err)
  process.exit(1)
})
