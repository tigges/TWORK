import { TRPCError } from '@trpc/server'
import { and, asc, desc, eq, isNull, ne, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import { z } from 'zod'
import {
  auditLog,
  blobs,
  can,
  canBatch,
  channels,
  channelMembers,
  contacts,
  documents,
  files as filesTable,
  mailMessages,
  searchIndex,
} from '@twork/db'
import { mailboxAddress } from './mailbox.js'
import { buildRfc5322, deliverMail, outboundConfigured } from './mail-send.js'
import { cleanFileName } from './file-name.js'
import { siblingNameTaken } from './files-shared.js'
import { storeRawMessage } from './mail-store.js'
import { calendarRouter } from './calendar-router.js'
import { authed, router } from './trpc.js'

// ── Files ─────────────────────────────────────────────────────────────────────

const filesRouter = router({
  list: authed
    .input(z.object({ parentId: z.string().uuid().nullable().default(null) }))
    .query(async ({ ctx, input }) => {
      const crumbs = await folderCrumbs(ctx.db, ctx.session.projectId, input.parentId)
      if (input.parentId && crumbs.at(-1)?.id !== input.parentId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Folder not found.' })
      }
      const rows = await ctx.db
        .select({
          id:          filesTable.id,
          name:        filesTable.name,
          isFolder:    filesTable.isFolder,
          updatedAt:   filesTable.updatedAt,
          sizeBytes:   blobs.sizeBytes,
          contentType: blobs.contentType,
        })
        .from(filesTable)
        .leftJoin(blobs, eq(blobs.id, filesTable.blobId))
        .where(and(
          eq(filesTable.projectId, ctx.session.projectId),
          input.parentId ? eq(filesTable.parentId, input.parentId) : isNull(filesTable.parentId),
          isNull(filesTable.deletedAt),
        ))
        .orderBy(desc(filesTable.isFolder), asc(filesTable.name))
      const access = await canBatch(
        ctx.session.userId,
        'read',
        rows.map(row => ({ type: 'file', id: row.id, projectId: ctx.session.projectId })),
        ctx.db,
      )
      return {
        crumbs,
        rows: rows.filter(row => access.get(row.id)),
      }
    }),

  mkdir: authed
    .input(z.object({
      parentId: z.string().uuid().nullable().default(null),
      name:     z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      await assertFilesWrite(ctx.session.userId, ctx.session.projectId, ctx.db)
      const name = cleanFileName(input.name)
      if (!name) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Use a folder name without slashes, up to 180 characters.' })
      if (input.parentId) {
        const crumbs = await folderCrumbs(ctx.db, ctx.session.projectId, input.parentId)
        if (crumbs.at(-1)?.id !== input.parentId) throw new TRPCError({ code: 'NOT_FOUND', message: 'Folder not found.' })
      }
      if (await siblingNameTaken(ctx.db, ctx.session.projectId, input.parentId, name)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'That name is already in this folder.' })
      }
      const id = uuidv7()
      await ctx.db.transaction(async tx => {
        await tx.insert(filesTable).values({
          id,
          projectId: ctx.session.projectId,
          parentId:  input.parentId,
          name,
          isFolder:  true,
          createdBy: ctx.session.userId,
        })
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'file.mkdir',
          objectType: 'file',
          objectId:   id,
          after:      { name, parentId: input.parentId },
        })
      })
      return { id }
    }),

  trash: authed.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id:        filesTable.id,
        name:      filesTable.name,
        isFolder:  filesTable.isFolder,
        updatedAt: filesTable.updatedAt,
      })
      .from(filesTable)
      .where(and(
        eq(filesTable.projectId, ctx.session.projectId),
        sql`${filesTable.deletedAt} IS NOT NULL`,
      ))
      .orderBy(desc(filesTable.deletedAt))
    const access = await canBatch(
      ctx.session.userId,
      'read',
      rows.map(row => ({ type: 'file', id: row.id, projectId: ctx.session.projectId })),
      ctx.db,
    )
    return rows.filter(row => access.get(row.id))
  }),

  remove: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await liveFile(ctx.db, ctx.session.projectId, input.id)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      const allowed = await can(ctx.session.userId, 'delete', {
        type: 'file', id: row.id, projectId: ctx.session.projectId,
      }, ctx.db)
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
      const now = new Date()
      await ctx.db.transaction(async tx => {
        await tx.update(filesTable).set({ deletedAt: now, updatedAt: now }).where(eq(filesTable.id, row.id))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'file.trash',
          objectType: 'file',
          objectId:   row.id,
          after:      { name: row.name },
        })
      })
      return { ok: true }
    }),

  restore: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: filesTable.id, name: filesTable.name, parentId: filesTable.parentId })
        .from(filesTable)
        .where(and(
          eq(filesTable.id, input.id),
          eq(filesTable.projectId, ctx.session.projectId),
          sql`${filesTable.deletedAt} IS NOT NULL`,
        ))
        .limit(1)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      const allowed = await can(ctx.session.userId, 'write', {
        type: 'file', id: row.id, projectId: ctx.session.projectId,
      }, ctx.db)
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
      let parentId = row.parentId
      if (parentId) {
        const crumbs = await folderCrumbs(ctx.db, ctx.session.projectId, parentId)
        if (crumbs.at(-1)?.id !== parentId) parentId = null
      }
      if (await siblingNameTaken(ctx.db, ctx.session.projectId, parentId, row.name)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'That name is already in the folder.' })
      }
      await ctx.db.transaction(async tx => {
        await tx.update(filesTable).set({
          deletedAt: null,
          parentId,
          updatedAt: new Date(),
        }).where(eq(filesTable.id, row.id))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'file.restore',
          objectType: 'file',
          objectId:   row.id,
          after:      { name: row.name, parentId },
        })
      })
      return { ok: true }
    }),
})

async function assertFilesWrite(userId: string, projectId: string, db: Parameters<typeof can>[3]) {
  const allowed = await can(userId, 'write', { type: 'project', id: projectId, projectId }, db)
  if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
}

async function liveFile(db: Parameters<typeof can>[3], projectId: string, id: string) {
  const [row] = await db
    .select({ id: filesTable.id, name: filesTable.name })
    .from(filesTable)
    .where(and(
      eq(filesTable.id, id),
      eq(filesTable.projectId, projectId),
      isNull(filesTable.deletedAt),
    ))
    .limit(1)
  return row
}

async function folderCrumbs(db: Parameters<typeof can>[3], projectId: string, folderId: string | null) {
  const crumbs: { id: string; name: string }[] = []
  let id = folderId
  for (let depth = 0; depth < 20 && id; depth++) {
    const [row] = await db
      .select({ id: filesTable.id, name: filesTable.name, parentId: filesTable.parentId })
      .from(filesTable)
      .where(and(
        eq(filesTable.id, id),
        eq(filesTable.projectId, projectId),
        eq(filesTable.isFolder, true),
        isNull(filesTable.deletedAt),
      ))
      .limit(1)
    if (!row) break
    crumbs.unshift({ id: row.id, name: row.name })
    id = row.parentId
  }
  return crumbs
}

// ── Pages ─────────────────────────────────────────────────────────────────────

const pagesRouter = router({
  list: authed.query(async ({ ctx }) =>
    ctx.db
      .select()
      .from(documents)
      .where(and(eq(documents.projectId, ctx.session.projectId), isNull(documents.deletedAt))),
  ),
})

// ── Mail ──────────────────────────────────────────────────────────────────────

const MAX_COPIES = 20

function addressListInput(label: string) {
  return z.array(z.string()).max(MAX_COPIES, `${label} can have at most ${MAX_COPIES} addresses.`).default([]).transform((values, ctx) => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const raw of values) {
      const addr = raw.trim().toLowerCase()
      if (!addr) continue
      if (!z.string().email().safeParse(addr).success) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} has an address that is not an email.` })
        return z.NEVER
      }
      if (seen.has(addr)) continue
      seen.add(addr)
      out.push(addr)
    }
    return out
  })
}

const mailRouter = router({
  address: authed.query(({ ctx }) => ({
    address: mailboxAddress(ctx.user.email),
  })),

  list: authed.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id:          mailMessages.id,
        subject:     mailMessages.subject,
        fromAddress: mailMessages.fromAddress,
        toAddresses: mailMessages.toAddresses,
        receivedAt:  mailMessages.receivedAt,
        direction:   mailMessages.direction,
        flags:       mailMessages.flags,
        labels:      mailMessages.labels,
        textBody:    mailMessages.textBody,
      })
      .from(mailMessages)
      .where(and(
        eq(mailMessages.projectId, ctx.session.projectId),
        eq(mailMessages.userId, ctx.session.userId),
        isNull(mailMessages.deletedAt),
      ))
      .orderBy(desc(mailMessages.receivedAt))
      .limit(100)

    const access = await canBatch(
      ctx.session.userId,
      'read',
      rows.map(row => ({ type: 'mail', id: row.id, projectId: ctx.session.projectId })),
      ctx.db,
    )
    return rows
      .filter(row => access.get(row.id))
      .map(row => ({
        id:          row.id,
        subject:     row.subject,
        fromAddress: row.fromAddress,
        toAddresses: row.toAddresses,
        receivedAt:  row.receivedAt,
        direction:   row.direction,
        flags:       row.flags,
        labels:      row.labels,
        snippet:     snippet(row.textBody),
      }))
  }),

  get: authed
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(mailMessages)
        .where(and(
          eq(mailMessages.id, input.id),
          eq(mailMessages.projectId, ctx.session.projectId),
          isNull(mailMessages.deletedAt),
        ))
        .limit(1)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      const allowed = await can(ctx.session.userId, 'read', {
        type: 'mail', id: row.id, projectId: ctx.session.projectId,
      }, ctx.db)
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
      return {
        id:           row.id,
        subject:      row.subject,
        fromAddress:  row.fromAddress,
        toAddresses:  row.toAddresses,
        ccAddresses:  row.ccAddresses,
        bccAddresses: row.bccAddresses,
        receivedAt:   row.receivedAt,
        direction:    row.direction,
        flags:        row.flags,
        labels:       row.labels,
        textBody:     row.textBody,
        messageIdHdr: row.messageIdHdr,
      }
    }),

  setLabels: authed
    .input(z.object({
      id:     z.string().uuid(),
      labels: z.array(z.string().max(80)).max(24),
    }))
    .mutation(async ({ ctx, input }) => {
      const labels = normalizeLabels(input.labels)
      const [row] = await ctx.db
        .select({ id: mailMessages.id, labels: mailMessages.labels })
        .from(mailMessages)
        .where(and(
          eq(mailMessages.id, input.id),
          eq(mailMessages.projectId, ctx.session.projectId),
          eq(mailMessages.userId, ctx.session.userId),
          isNull(mailMessages.deletedAt),
        ))
        .limit(1)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      const allowed = await can(ctx.session.userId, 'write', {
        type: 'mail', id: row.id, projectId: ctx.session.projectId,
      }, ctx.db)
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
      if (sameLabels(row.labels, labels)) return { labels }
      await ctx.db.transaction(async tx => {
        await tx.update(mailMessages).set({
          labels,
          updatedAt: new Date(),
        }).where(eq(mailMessages.id, row.id))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'mail.label',
          objectType: 'mail',
          objectId:   row.id,
          before:     { labels: row.labels },
          after:      { labels },
        })
      })
      return { labels }
    }),

  markRead: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ id: mailMessages.id, flags: mailMessages.flags })
        .from(mailMessages)
        .where(and(
          eq(mailMessages.id, input.id),
          eq(mailMessages.projectId, ctx.session.projectId),
          eq(mailMessages.userId, ctx.session.userId),
          isNull(mailMessages.deletedAt),
        ))
        .limit(1)
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
      if (!row.flags.includes('unread')) return { ok: true }
      await ctx.db.update(mailMessages).set({
        flags:     row.flags.filter(flag => flag !== 'unread'),
        updatedAt: new Date(),
      }).where(eq(mailMessages.id, row.id))
      return { ok: true }
    }),

  send: authed
    .input(z.object({
      to:         z.string().email(),
      cc:         addressListInput('Cc'),
      bcc:        addressListInput('Bcc'),
      subject:    z.string().min(1).max(998),
      text:       z.string().min(1).max(200_000),
      inReplyTo:  z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const allowed = await can(ctx.session.userId, 'write', {
        type: 'project', id: ctx.session.projectId, projectId: ctx.session.projectId,
      }, ctx.db)
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
      if (!outboundConfigured()) {
        throw new TRPCError({
          code:    'PRECONDITION_FAILED',
          message: 'Outbound mail is not configured yet. Set RESEND_API_KEY to send.',
        })
      }

      const to = input.to.trim()
      const toKey = to.toLowerCase()
      const cc = input.cc.filter(addr => addr !== toKey)
      const ccKeys = new Set(cc)
      const bcc = input.bcc.filter(addr => addr !== toKey && !ccKeys.has(addr))

      const fromAddress = mailboxAddress(ctx.user.email)
      const raw = buildRfc5322({
        fromName:    ctx.user.displayName,
        fromAddress,
        to,
        cc,
        bcc,
        subject:     input.subject,
        text:        input.text,
        ...(input.inReplyTo ? { inReplyTo: input.inReplyTo } : {}),
      })
      const id = await storeRawMessage(ctx.db, ctx.storage, {
        projectId: ctx.session.projectId,
        userId:    ctx.session.userId,
        direction: 'outbound',
        raw,
      })
      try {
        await deliverMail({
          fromName:    ctx.user.displayName,
          fromAddress,
          to,
          cc,
          bcc,
          subject:     input.subject,
          text:        input.text,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'send failed'
        throw new TRPCError({ code: 'BAD_GATEWAY', message })
      }
      return { id }
    }),
})

function snippet(text: string | null): string {
  if (!text) return ''
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > 120 ? `${line.slice(0, 117)}…` : line
}

const MAX_LABELS = 12
const MAX_LABEL_LENGTH = 40

function normalizeLabels(input: string[]): string[] {
  const seen = new Set<string>()
  const labels: string[] = []
  for (const raw of input) {
    const label = raw.trim().replace(/\s+/g, ' ')
    if (!label) continue
    if (label.length > MAX_LABEL_LENGTH) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Labels can be at most 40 characters.' })
    }
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    labels.push(label)
    if (labels.length > MAX_LABELS) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'A message can have at most 12 labels.' })
    }
  }
  return labels
}

function sameLabels(current: string[], next: string[]): boolean {
  return current.length === next.length && current.every((label, index) => label === next[index])
}

// ── Rooms (chat) ──────────────────────────────────────────────────────────────

const roomsRouter = router({
  channels: authed.query(async ({ ctx }) =>
    ctx.db
      .select({ id: channels.id, name: channels.name, topic: channels.topic, isDm: channels.isDm })
      .from(channels)
      .innerJoin(
        channelMembers,
        and(
          eq(channelMembers.channelId, channels.id),
          eq(channelMembers.userId,    ctx.session.userId),
          isNull(channelMembers.deletedAt),
        ),
      )
      .where(and(eq(channels.projectId, ctx.session.projectId), isNull(channels.deletedAt))),
  ),
})

// ── Contacts ──────────────────────────────────────────────────────────────────

const contactInput = z.object({
  name:  z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(4000).optional(),
})

const contactsRouter = router({
  list: authed
    .input(z.object({ q: z.string().max(200).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const q = input?.q?.trim().toLowerCase() ?? ''
      const needle = `%${q.replace(/[%_]/g, '')}%`
      const rows = await ctx.db
        .select()
        .from(contacts)
        .where(and(
          eq(contacts.projectId, ctx.session.projectId),
          eq(contacts.userId, ctx.session.userId),
          isNull(contacts.deletedAt),
          q
            ? sql`(lower(${contacts.name}) like ${needle} OR lower(${contacts.email}) like ${needle})`
            : undefined,
        ))
        .orderBy(asc(contacts.name))
        .limit(500)

      const access = await canBatch(
        ctx.session.userId,
        'read',
        rows.map(row => ({ type: 'contact', id: row.id, projectId: ctx.session.projectId })),
        ctx.db,
      )
      return rows.filter(row => access.get(row.id)).map(row => ({
        id:    row.id,
        name:  row.name,
        email: row.email,
        phone: row.phone,
        notes: row.notes,
      }))
    }),

  create: authed
    .input(contactInput)
    .mutation(async ({ ctx, input }) => {
      await assertProjectWrite(ctx)
      const email = input.email.toLowerCase()
      const [existing] = await ctx.db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(
          eq(contacts.projectId, ctx.session.projectId),
          eq(contacts.userId, ctx.session.userId),
          sql`lower(${contacts.email}) = ${email}`,
          isNull(contacts.deletedAt),
        ))
        .limit(1)
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'That email is already in Contacts.' })

      const id = uuidv7()
      await ctx.db.transaction(async tx => {
        await tx.insert(contacts).values({
          id,
          projectId: ctx.session.projectId,
          userId:    ctx.session.userId,
          name:      input.name,
          email,
          phone:     input.phone || null,
          notes:     input.notes || null,
        })
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'contact.create',
          objectType: 'contact',
          objectId:   id,
          after:      { name: input.name, email },
        })
      })
      return { id }
    }),

  update: authed
    .input(contactInput.extend({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadContact(ctx, input.id)
      const email = input.email.toLowerCase()
      const [existing] = await ctx.db
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(
          eq(contacts.projectId, ctx.session.projectId),
          eq(contacts.userId, ctx.session.userId),
          sql`lower(${contacts.email}) = ${email}`,
          isNull(contacts.deletedAt),
          ne(contacts.id, row.id),
        ))
        .limit(1)
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'That email is already in Contacts.' })

      await ctx.db.transaction(async tx => {
        await tx.update(contacts).set({
          name:      input.name,
          email,
          phone:     input.phone || null,
          notes:     input.notes || null,
          updatedAt: new Date(),
        }).where(eq(contacts.id, row.id))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'contact.update',
          objectType: 'contact',
          objectId:   row.id,
          before:     { name: row.name, email: row.email },
          after:      { name: input.name, email },
        })
      })
      return { id: row.id }
    }),

  remove: authed
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await loadContact(ctx, input.id)
      const now = new Date()
      await ctx.db.transaction(async tx => {
        await tx.update(contacts).set({ deletedAt: now, updatedAt: now }).where(eq(contacts.id, row.id))
        await tx.insert(auditLog).values({
          id:         uuidv7(),
          projectId:  ctx.session.projectId,
          actorId:    ctx.session.userId,
          action:     'contact.delete',
          objectType: 'contact',
          objectId:   row.id,
          before:     { name: row.name, email: row.email },
        })
      })
      return { ok: true }
    }),
})

async function assertProjectWrite(ctx: { session: { userId: string; projectId: string }; db: Parameters<typeof can>[3] }) {
  const allowed = await can(ctx.session.userId, 'write', {
    type: 'project', id: ctx.session.projectId, projectId: ctx.session.projectId,
  }, ctx.db)
  if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
}

async function loadContact(
  ctx: { session: { userId: string; projectId: string }; db: Parameters<typeof can>[3] },
  id: string,
) {
  const [row] = await ctx.db
    .select()
    .from(contacts)
    .where(and(
      eq(contacts.id, id),
      eq(contacts.projectId, ctx.session.projectId),
      eq(contacts.userId, ctx.session.userId),
      isNull(contacts.deletedAt),
    ))
    .limit(1)
  if (!row) throw new TRPCError({ code: 'NOT_FOUND' })
  const allowed = await can(ctx.session.userId, 'write', {
    type: 'contact', id: row.id, projectId: ctx.session.projectId,
  }, ctx.db)
  if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' })
  return row
}

// ── Search ────────────────────────────────────────────────────────────────────

const searchRouter = router({
  query: authed
    .input(z.object({ q: z.string().min(1) }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .select({
          objectType: searchIndex.objectType,
          objectId:   searchIndex.objectId,
          plainText:  searchIndex.plainText,
        })
        .from(searchIndex)
        .where(
          sql`${searchIndex.projectId} = ${ctx.session.projectId}
            AND to_tsvector('english', ${searchIndex.plainText}) @@ plainto_tsquery('english', ${input.q})`,
        )
        .limit(50),
    ),
})

// ── App router ────────────────────────────────────────────────────────────────

export const appRouter = router({
  files:    filesRouter,
  pages:    pagesRouter,
  mail:     mailRouter,
  contacts: contactsRouter,
  calendar: calendarRouter,
  rooms:    roomsRouter,
  search:   searchRouter,
})

export type AppRouter = typeof appRouter
