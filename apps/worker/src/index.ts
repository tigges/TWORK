/**
 * TWork background worker.
 * Same Docker image as the server; CMD overridden in docker-compose.yml.
 *
 * Job queue: pg-boss (PostgreSQL-backed, no Redis dependency).
 *
 * Jobs (stubs — filled in as each module is built):
 *   post.parse-raw   Parse raw RFC 5322 blob → populate mail_messages fields
 *   search.index     Upsert search_index row for a given object
 *   blobs.gc         Decrement ref_count → delete from S3 when it hits 0
 */
import PgBoss from 'pg-boss'
import { createDb, runMigrations, webauthnChallenges } from '@twork/db'
import { StorageClient } from '@twork/storage'
import { lt } from 'drizzle-orm'

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
  const _storage = new StorageClient({
    endpoint:  S3_ENDPOINT,
    region:    S3_REGION,
    bucket:    S3_BUCKET,
    accessKey: S3_ACCESS_KEY,
    secretKey: S3_SECRET_KEY,
  })

  const boss = new PgBoss(DB_URL)
  await boss.start()
  console.log('[worker] pg-boss started')

  // ── post.parse-raw ──────────────────────────────────────────────────────────
  await boss.work<{ messageId: string }>('post.parse-raw', async jobs => {
    for (const job of jobs) {
      console.log(`[worker] post.parse-raw ${job.data.messageId} (stub)`)
    }
  })

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
