import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify'
import type { DB } from '@twork/db'
import { grants, sessions, users } from '@twork/db'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { StorageClient } from '@twork/storage'

export interface SessionData {
  id:        string
  userId:    string
  projectId: string
}

export interface UserData {
  id:          string
  email:       string
  displayName: string
}

export interface Context {
  db:      DB
  storage: StorageClient
  session: SessionData | null
  user:    UserData    | null
}

export async function createContext(
  opts:    CreateFastifyContextOptions,
  db:      DB,
  storage: StorageClient,
): Promise<Context> {
  const token = opts.req.cookies?.['session']
  if (!token) return { db, storage, session: null, user: null }

  const now = new Date()

  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId:    sessions.userId,
      email:     users.email,
      name:      users.displayName,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.token, token),
        gt(sessions.expiresAt, now),
        isNull(sessions.deletedAt),
        isNull(users.deletedAt),
      ),
    )
    .limit(1)

  if (!row) return { db, storage, session: null, user: null }

  const [grantRow] = await db
    .select({ projectId: grants.projectId })
    .from(grants)
    .where(
      and(
        eq(grants.userId,     row.userId),
        eq(grants.objectType, 'project'),
        isNull(grants.objectId),
        isNull(grants.deletedAt),
      ),
    )
    .limit(1)

  const projectId = grantRow?.projectId ?? ''

  return {
    db,
    storage,
    session: { id: row.sessionId, userId: row.userId, projectId },
    user:    { id: row.userId, email: row.email, displayName: row.name },
  }
}
