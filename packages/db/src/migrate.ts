import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function runMigrations(connectionString: string): Promise<void> {
  const sql = postgres(connectionString, { max: 1 })

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    const migrationsDir = join(__dirname, '../migrations')
    const files = (await readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      const [{ count }] = await sql<[{ count: string }]>`
        SELECT COUNT(*)::text AS count FROM _migrations WHERE filename = ${file}
      `
      if (Number(count) > 0) continue

      const content = await readFile(join(migrationsDir, file), 'utf-8')
      await sql.begin(async tx => {
        await tx.unsafe(content)
        await tx`INSERT INTO _migrations (filename) VALUES (${file})`
      })

      console.log(`[migrate] applied ${file}`)
    }
  } finally {
    await sql.end()
  }
}
