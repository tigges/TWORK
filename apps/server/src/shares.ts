import { TRPCError } from '@trpc/server'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { can, contacts, shares } from '@twork/db'

type QueryDb = Parameters<typeof can>[3]

export const shareTypes = ['file', 'contact', 'event'] as const
export type ShareType = (typeof shareTypes)[number]

const MAX_SHARES = 24

type ShareRow = { id: string; name: string }

export async function listShares(
  db: QueryDb,
  projectId: string,
  objectType: ShareType,
  objectId: string,
): Promise<ShareRow[]> {
  const grouped = await shareNames(db, projectId, objectType, [objectId])
  return grouped.get(objectId) ?? []
}

export async function shareNames(
  db: QueryDb,
  projectId: string,
  objectType: ShareType,
  objectIds: string[],
): Promise<Map<string, ShareRow[]>> {
  const grouped = new Map<string, ShareRow[]>()
  if (objectIds.length === 0) return grouped
  const rows = await db
    .select({
      objectId: shares.objectId,
      id:       contacts.id,
      name:     contacts.name,
    })
    .from(shares)
    .innerJoin(contacts, eq(contacts.id, shares.contactId))
    .where(and(
      eq(shares.projectId, projectId),
      eq(shares.objectType, objectType),
      inArray(shares.objectId, objectIds),
      isNull(shares.deletedAt),
      isNull(contacts.deletedAt),
    ))
    .orderBy(asc(contacts.name))
  for (const row of rows) {
    const list = grouped.get(row.objectId) ?? []
    list.push({ id: row.id, name: row.name })
    grouped.set(row.objectId, list)
  }
  return grouped
}

export async function objectIdsSharedWith(
  db: QueryDb,
  projectId: string,
  email: string,
  objectType: ShareType,
): Promise<string[]> {
  const normalized = email.trim().toLowerCase()
  if (!projectId || !normalized) return []
  const rows = await db
    .select({ objectId: shares.objectId })
    .from(shares)
    .innerJoin(contacts, eq(contacts.id, shares.contactId))
    .where(and(
      eq(shares.projectId, projectId),
      eq(shares.objectType, objectType),
      isNull(shares.deletedAt),
      eq(contacts.projectId, projectId),
      isNull(contacts.deletedAt),
      emailMatches(normalized),
    ))
  return [...new Set(rows.map(row => row.objectId))]
}

export async function isSharedWith(
  db: QueryDb,
  projectId: string,
  email: string,
  objectType: ShareType,
  objectId: string,
): Promise<boolean> {
  const normalized = email.trim().toLowerCase()
  if (!projectId || !normalized) return false
  const [row] = await db
    .select({ id: shares.id })
    .from(shares)
    .innerJoin(contacts, eq(contacts.id, shares.contactId))
    .where(and(
      eq(shares.projectId, projectId),
      eq(shares.objectType, objectType),
      eq(shares.objectId, objectId),
      isNull(shares.deletedAt),
      eq(contacts.projectId, projectId),
      isNull(contacts.deletedAt),
      emailMatches(normalized),
    ))
    .limit(1)
  return !!row
}

export async function replaceShares(
  db: QueryDb,
  opts: {
    projectId:  string
    userId:     string
    objectType: ShareType
    objectId:   string
    contactIds: string[]
    forbidId?:  string
  },
): Promise<void> {
  const contactIds = [...new Set(opts.contactIds)]
  if (contactIds.length > MAX_SHARES) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Too many people.' })
  }
  if (opts.forbidId && contactIds.includes(opts.forbidId)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'A contact cannot be shared with itself.' })
  }
  if (contactIds.length > 0) {
    const owned = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(
        eq(contacts.projectId, opts.projectId),
        eq(contacts.userId, opts.userId),
        inArray(contacts.id, contactIds),
        isNull(contacts.deletedAt),
      ))
    if (owned.length !== contactIds.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Choose a contact.' })
    }
  }

  const now = new Date()
  const existing = await db
    .select({ id: shares.id, contactId: shares.contactId })
    .from(shares)
    .where(and(
      eq(shares.projectId, opts.projectId),
      eq(shares.objectType, opts.objectType),
      eq(shares.objectId, opts.objectId),
      isNull(shares.deletedAt),
    ))
  const keep = new Set(contactIds)
  for (const row of existing) {
    if (keep.has(row.contactId)) continue
    await db.update(shares).set({ deletedAt: now, updatedAt: now }).where(eq(shares.id, row.id))
  }
  const have = new Set(existing.map(row => row.contactId))
  for (const contactId of contactIds) {
    if (have.has(contactId)) continue
    const [dead] = await db
      .select({ id: shares.id })
      .from(shares)
      .where(and(
        eq(shares.projectId, opts.projectId),
        eq(shares.objectType, opts.objectType),
        eq(shares.objectId, opts.objectId),
        eq(shares.contactId, contactId),
      ))
      .limit(1)
    if (dead) {
      await db.update(shares).set({ deletedAt: null, updatedAt: now }).where(eq(shares.id, dead.id))
    } else {
      await db.insert(shares).values({
        id:         uuidv7(),
        projectId:  opts.projectId,
        objectType: opts.objectType,
        objectId:   opts.objectId,
        contactId,
      })
    }
  }
}

function emailMatches(normalized: string) {
  return sql`(lower(${contacts.email}) = ${normalized} OR ${normalized} = ANY(${contacts.emails}))`
}
