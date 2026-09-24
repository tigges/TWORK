import { and, eq, inArray, isNull } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { grants } from './schema.js'
import type * as schema from './schema.js'

export type Role   = 'owner' | 'editor' | 'viewer'
export type Action = 'read' | 'write' | 'delete' | 'share' | 'admin'

export interface ObjectRef {
  type:      string
  id:        string
  projectId: string
}

// Capabilities per role — owner ⊃ editor ⊃ viewer.
const ROLE_CAPS: Record<Role, ReadonlySet<Action>> = {
  owner:  new Set(['read', 'write', 'delete', 'share', 'admin']),
  editor: new Set(['read', 'write', 'delete']),
  viewer: new Set(['read']),
}

function roleAllows(role: Role, action: Action): boolean {
  return ROLE_CAPS[role]?.has(action) ?? false
}

type DB = PostgresJsDatabase<typeof schema>

/**
 * The single authorisation gate. No module implements its own check.
 *
 * Resolution order:
 *   1. Object-level grant  (e.g. viewer on this specific file)
 *   2. Project-level grant (e.g. editor on the whole project)
 *   3. Deny
 */
export async function can(
  actorId: string,
  action:  Action,
  object:  ObjectRef,
  db:      DB,
): Promise<boolean> {
  const [objectGrant] = await db
    .select({ role: grants.role })
    .from(grants)
    .where(
      and(
        eq(grants.projectId,  object.projectId),
        eq(grants.userId,     actorId),
        eq(grants.objectType, object.type),
        eq(grants.objectId,   object.id),
        isNull(grants.deletedAt),
      ),
    )
    .limit(1)

  if (objectGrant) return roleAllows(objectGrant.role as Role, action)

  const [projectGrant] = await db
    .select({ role: grants.role })
    .from(grants)
    .where(
      and(
        eq(grants.projectId,  object.projectId),
        eq(grants.userId,     actorId),
        eq(grants.objectType, 'project'),
        isNull(grants.objectId),
        isNull(grants.deletedAt),
      ),
    )
    .limit(1)

  if (projectGrant) return roleAllows(projectGrant.role as Role, action)

  return false
}

/**
 * Batch variant — required for every list query.
 * Calling the singular can() per row is prohibited in list handlers (N+1).
 * All objects must share the same type and projectId.
 */
export async function canBatch(
  actorId: string,
  action:  Action,
  objects: ObjectRef[],
  db:      DB,
): Promise<Map<string, boolean>> {
  if (objects.length === 0) return new Map()

  const { projectId, type } = objects[0]!
  const ids = objects.map(o => o.id)

  const [objectGrants, projectGrantRows] = await Promise.all([
    db.select({ objectId: grants.objectId, role: grants.role })
      .from(grants)
      .where(
        and(
          eq(grants.projectId,  projectId),
          eq(grants.userId,     actorId),
          eq(grants.objectType, type),
          inArray(grants.objectId, ids),
          isNull(grants.deletedAt),
        ),
      ),
    db.select({ role: grants.role })
      .from(grants)
      .where(
        and(
          eq(grants.projectId,  projectId),
          eq(grants.userId,     actorId),
          eq(grants.objectType, 'project'),
          isNull(grants.objectId),
          isNull(grants.deletedAt),
        ),
      )
      .limit(1),
  ])

  const byId     = new Map(objectGrants.map(g => [g.objectId!, g.role as Role]))
  const fallback = projectGrantRows[0]?.role as Role | undefined

  return new Map(
    objects.map(obj => {
      const role = byId.get(obj.id) ?? fallback
      return [obj.id, role ? roleAllows(role, action) : false] as const
    }),
  )
}

/**
 * assert() — throws FORBIDDEN if the actor cannot perform the action.
 * Use in tRPC procedure handlers; never inside list queries (use canBatch there).
 */
export async function assert(
  actorId: string,
  action:  Action,
  object:  ObjectRef,
  db:      DB,
): Promise<void> {
  const ok = await can(actorId, action, object, db)
  if (!ok) throw new ForbiddenError()
}

export class ForbiddenError extends Error {
  readonly code = 'FORBIDDEN' as const
  constructor() { super('Forbidden') }
}
