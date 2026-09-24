/**
 * Hand-seeds one user and one project.
 * Phase 1: no sign-up, no invitations.
 *
 * Run once: pnpm --filter @twork/db seed
 * Idempotent: re-running is safe (skips if user already exists).
 */
import postgres from 'postgres'
import { uuidv7 } from 'uuidv7'

const DATABASE_URL = process.env['DATABASE_URL']
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

const SEED_EMAIL   = process.env['SEED_EMAIL']   ?? 'admin@twork.local'
const SEED_NAME    = process.env['SEED_NAME']    ?? 'Admin'
const SEED_PROJECT = process.env['SEED_PROJECT'] ?? 'twork'

const sql = postgres(DATABASE_URL)

const [existing] = await sql`SELECT id FROM users WHERE email = ${SEED_EMAIL} LIMIT 1`
if (existing) {
  console.log(`User ${SEED_EMAIL} already exists — skipping seed`)
  await sql.end()
  process.exit(0)
}

const userId    = uuidv7()
const projectId = uuidv7()
const grantId   = uuidv7()
const now       = new Date()

await sql.begin(async sql => {
  await sql`
    INSERT INTO users (id, email, display_name, created_at, updated_at)
    VALUES (${userId}, ${SEED_EMAIL}, ${SEED_NAME}, ${now}, ${now})
  `
  await sql`
    INSERT INTO projects (id, name, slug, created_at, updated_at)
    VALUES (${projectId}, ${SEED_PROJECT}, ${SEED_PROJECT}, ${now}, ${now})
  `
  await sql`
    INSERT INTO grants (id, project_id, user_id, object_type, object_id, role, created_at, updated_at)
    VALUES (${grantId}, ${projectId}, ${userId}, 'project', NULL, 'owner', ${now}, ${now})
  `
})

console.log(`Seeded user ${SEED_EMAIL} (${userId}) in project "${SEED_PROJECT}" (${projectId})`)
console.log('Next: register a passkey at /auth/setup')

await sql.end()
