export * from './schema.js'
export * from './can.js'
export { runMigrations } from './migrate.js'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

export type DB = ReturnType<typeof createDb>

export function createDb(connectionString: string) {
  const client = postgres(connectionString)
  return drizzle(client, { schema })
}
