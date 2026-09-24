import { and, eq, isNull, sql } from 'drizzle-orm'
import { files, type DB } from '@twork/db'

export async function siblingNameTaken(
  db:        DB,
  projectId: string,
  parentId:  string | null,
  name:      string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: files.id })
    .from(files)
    .where(and(
      eq(files.projectId, projectId),
      parentId ? eq(files.parentId, parentId) : isNull(files.parentId),
      sql`lower(${files.name}) = ${name.toLowerCase()}`,
      isNull(files.deletedAt),
    ))
    .limit(1)
  return Boolean(row)
}
