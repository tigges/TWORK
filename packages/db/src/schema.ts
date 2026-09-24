import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

// ─── Column helpers ────────────────────────────────────────────────────────────
// id is UUIDv7, generated in application code via the `uuidv7` package.
// PostgreSQL's gen_random_uuid() is v4 — do not use it for ids.

const base = {
  id:        uuid('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}

// ─── Identity — supra-project (no project_id) ─────────────────────────────────

export const users = pgTable('users', {
  ...base,
  email:       text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
})

export const sessions = pgTable('sessions', {
  ...base,
  userId:    uuid('user_id').notNull().references(() => users.id),
  token:     text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
})

export const passkeys = pgTable('passkeys', {
  ...base,
  userId:       uuid('user_id').notNull().references(() => users.id),
  credentialId: text('credential_id').notNull().unique(),
  publicKey:    text('public_key').notNull(),  // base64url COSE key
  counter:      bigint('counter', { mode: 'number' }).notNull().default(0),
  transports:   text('transports').array(),
  label:        text('label'),
})

// Ephemeral: holds WebAuthn challenges between issue and verify.
export const webauthnChallenges = pgTable('webauthn_challenges', {
  id:        uuid('id').primaryKey(),
  userId:    uuid('user_id').references(() => users.id),
  challenge: text('challenge').notNull(),
  type:      text('type').notNull(),  // 'registration' | 'authentication'
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Core ─────────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  ...base,
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
})

// One row = one permission grant.
// objectId NULL   → project-level grant (applies to the whole project)
// objectId non-null → object-level override (specific file, channel, etc.)
export const grants = pgTable('grants', {
  ...base,
  projectId:  uuid('project_id').notNull().references(() => projects.id),
  userId:     uuid('user_id').notNull().references(() => users.id),
  objectType: text('object_type').notNull(),  // 'project'|'file'|'document'|'channel'|…
  objectId:   uuid('object_id'),
  role:       text('role').notNull(),          // 'owner'|'editor'|'viewer'
}, t => ([
  uniqueIndex('grants_unique_idx').on(t.projectId, t.userId, t.objectType, t.objectId),
]))

// Append-only. Written in the same transaction as every mutating operation.
// Intentionally has NO updatedAt and NO deletedAt — history is immutable.
export const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey(),
  projectId:  uuid('project_id').notNull(),
  actorId:    uuid('actor_id').notNull().references(() => users.id),
  action:     text('action').notNull(),       // 'file.create' | 'message.trash' | …
  objectType: text('object_type').notNull(),
  objectId:   uuid('object_id').notNull(),
  before:     jsonb('before'),
  after:      jsonb('after'),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Blob storage — content-addressed, per-project ───────────────────────────

export const blobs = pgTable('blobs', {
  ...base,
  projectId:   uuid('project_id').notNull().references(() => projects.id),
  sha256:      text('sha256').notNull(),
  sizeBytes:   bigint('size_bytes', { mode: 'number' }).notNull(),
  contentType: text('content_type').notNull(),
  storageKey:  text('storage_key').notNull(),
  refCount:    bigint('ref_count', { mode: 'number' }).notNull().default(0),
}, t => ([
  uniqueIndex('blobs_sha256_project_idx').on(t.projectId, t.sha256),
]))

// ─── Files ────────────────────────────────────────────────────────────────────

export const files = pgTable('files', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  parentId:  uuid('parent_id'),   // self-referential; null = root
  name:      text('name').notNull(),
  isFolder:  boolean('is_folder').notNull().default(false),
  blobId:    uuid('blob_id').references(() => blobs.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
}, t => ([
  index('files_parent_idx').on(t.parentId),
  index('files_project_idx').on(t.projectId, t.deletedAt),
]))

// ─── Pages (documents) ────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  title:     text('title').notNull().default('Untitled'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
})

// Immutable: no updatedAt, no deletedAt — revisions are permanent records.
export const documentRevisions = pgTable('document_revisions', {
  id:         uuid('id').primaryKey(),
  projectId:  uuid('project_id').notNull(),
  documentId: uuid('document_id').notNull().references(() => documents.id),
  blobId:     uuid('blob_id').notNull().references(() => blobs.id),
  createdBy:  uuid('created_by').notNull().references(() => users.id),
  createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ([
  index('doc_revisions_doc_idx').on(t.documentId, t.createdAt),
]))

// ─── Mail ─────────────────────────────────────────────────────────────────────

export const mailThreads = pgTable('mail_threads', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  subject:   text('subject').notNull(),
})

export const mailMessages = pgTable('mail_messages', {
  ...base,
  projectId:    uuid('project_id').notNull().references(() => projects.id),
  userId:       uuid('user_id').notNull().references(() => users.id),
  threadId:     uuid('thread_id').references(() => mailThreads.id),
  // NON-NEGOTIABLE: rawBlobId stores the complete RFC 5322 message verbatim.
  // Fields below are parsed by the worker asynchronously after the blob is committed.
  rawBlobId:    uuid('raw_blob_id').notNull().references(() => blobs.id),
  messageIdHdr: text('message_id_hdr'),
  subject:      text('subject'),
  fromAddress:  text('from_address'),
  toAddresses:  text('to_addresses').array(),
  ccAddresses:  text('cc_addresses').array(),
  bccAddresses: text('bcc_addresses').array(),
  receivedAt:   timestamp('received_at', { withTimezone: true }).notNull(),
  direction:    text('direction').notNull(),  // 'inbound' | 'outbound'
  flags:        text('flags').array().notNull().default([]),
  labels:       text('labels').array().notNull().default([]),
  textBody:     text('text_body'),
  inReplyTo:    text('in_reply_to'),
  // Null until the raw blob has been parsed. The blob is always written first.
  parsedAt:     timestamp('parsed_at', { withTimezone: true }),
}, t => ([
  index('mail_messages_msgid_idx').on(t.messageIdHdr),
  index('mail_messages_thread_idx').on(t.threadId),
]))

// ─── Contacts (address book) ──────────────────────────────────────────────────

export const contacts = pgTable('contacts', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  userId:    uuid('user_id').notNull().references(() => users.id),
  name:      text('name').notNull(),
  email:     text('email').notNull(),
  phone:     text('phone'),
  notes:     text('notes'),
}, t => ([
  index('contacts_owner_idx').on(t.projectId, t.userId),
]))

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const calendarEvents = pgTable('calendar_events', {
  ...base,
  projectId:   uuid('project_id').notNull().references(() => projects.id),
  title:       text('title').notNull(),
  description: text('description'),
  allDay:      boolean('all_day').notNull().default(false),
  // NON-NEGOTIABLE triple — all three required for every event.
  startUtc: timestamp('start_utc', { withTimezone: true }).notNull(),
  startTz:  text('start_tz').notNull(),   // IANA tz name: 'Europe/London'
  endUtc:   timestamp('end_utc', { withTimezone: true }).notNull(),
  endTz:    text('end_tz').notNull(),
  // RFC 5545 RRULE stored verbatim. Occurrences are NEVER pre-expanded into rows.
  rrule:    text('rrule'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
}, t => ([
  index('cal_events_range_idx').on(t.startUtc, t.endUtc),
]))

// Stores modifications/cancellations of individual occurrences in recurring events.
// occurrenceStartUtc identifies which original occurrence this row overrides.
export const calendarEventExceptions = pgTable('calendar_event_exceptions', {
  ...base,
  projectId:          uuid('project_id').notNull().references(() => projects.id),
  eventId:            uuid('event_id').notNull().references(() => calendarEvents.id),
  occurrenceStartUtc: timestamp('occurrence_start_utc', { withTimezone: true }).notNull(),
  isCancelled:        boolean('is_cancelled').notNull().default(false),
  title:    text('title'),
  startUtc: timestamp('start_utc', { withTimezone: true }),
  endUtc:   timestamp('end_utc', { withTimezone: true }),
}, t => ([
  uniqueIndex('cal_exceptions_unique_idx').on(t.eventId, t.occurrenceStartUtc),
]))

export const calendarAttendees = pgTable('calendar_attendees', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  eventId:   uuid('event_id').notNull().references(() => calendarEvents.id),
  userId:    uuid('user_id').notNull().references(() => users.id),
  status:    text('status').notNull().default('pending'),
  // 'pending' | 'accepted' | 'declined' | 'tentative'
}, t => ([
  uniqueIndex('cal_attendees_unique_idx').on(t.eventId, t.userId),
]))

// ─── Rooms (chat) ─────────────────────────────────────────────────────────────

export const channels = pgTable('channels', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  name:      text('name').notNull(),
  topic:     text('topic'),
  isDm:      boolean('is_dm').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
})

export const channelMembers = pgTable('channel_members', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  channelId: uuid('channel_id').notNull().references(() => channels.id),
  userId:    uuid('user_id').notNull().references(() => users.id),
}, t => ([
  uniqueIndex('channel_members_unique_idx').on(t.channelId, t.userId),
]))

export const chatMessages = pgTable('chat_messages', {
  ...base,
  projectId: uuid('project_id').notNull().references(() => projects.id),
  channelId: uuid('channel_id').notNull().references(() => channels.id),
  userId:    uuid('user_id').notNull().references(() => users.id),
  parentId:  uuid('parent_id'),  // null = top-level; non-null = thread reply
  body:      text('body').notNull(),
  editedAt:  timestamp('edited_at', { withTimezone: true }),
}, t => ([
  index('chat_messages_channel_idx').on(t.channelId, t.createdAt),
]))

// ─── Search — cross-module, maintained by worker ──────────────────────────────
// tsv tsvector column is added in SQL migration (not expressible cleanly in Drizzle).
// The GIN index lives in the migration file.

export const searchIndex = pgTable('search_index', {
  id:         uuid('id').primaryKey(),
  projectId:  uuid('project_id').notNull(),
  objectType: text('object_type').notNull(),
  objectId:   uuid('object_id').notNull(),
  plainText:  text('plain_text').notNull(),
  updatedAt:  timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, t => ([
  uniqueIndex('search_idx_unique').on(t.projectId, t.objectType, t.objectId),
]))
