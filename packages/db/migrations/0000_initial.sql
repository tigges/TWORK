-- ─── Identity ─────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id           UUID PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

CREATE TABLE sessions (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users(id),
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE passkeys (
  id            UUID PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id),
  credential_id TEXT NOT NULL UNIQUE,
  public_key    TEXT NOT NULL,
  counter       BIGINT NOT NULL DEFAULT 0,
  transports    TEXT[],
  label         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE TABLE webauthn_challenges (
  id         UUID PRIMARY KEY,
  user_id    UUID REFERENCES users(id),
  challenge  TEXT NOT NULL,
  type       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Core ─────────────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id         UUID PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE grants (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  object_type TEXT NOT NULL,
  object_id   UUID,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE NULLS NOT DISTINCT (project_id, user_id, object_type, object_id)
);

CREATE TABLE audit_log (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL,
  actor_id    UUID NOT NULL REFERENCES users(id),
  action      TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id   UUID NOT NULL,
  before      JSONB,
  after       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Blobs ────────────────────────────────────────────────────────────────────

CREATE TABLE blobs (
  id           UUID PRIMARY KEY,
  project_id   UUID NOT NULL REFERENCES projects(id),
  sha256       TEXT NOT NULL,
  size_bytes   BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  storage_key  TEXT NOT NULL,
  ref_count    BIGINT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  UNIQUE (project_id, sha256)
);

-- ─── Files ────────────────────────────────────────────────────────────────────

CREATE TABLE files (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  parent_id  UUID REFERENCES files(id),
  name       TEXT NOT NULL,
  is_folder  BOOLEAN NOT NULL DEFAULT false,
  blob_id    UUID REFERENCES blobs(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX files_parent_idx  ON files(parent_id);
CREATE INDEX files_project_idx ON files(project_id, deleted_at);

-- ─── Pages (documents) ────────────────────────────────────────────────────────

CREATE TABLE documents (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  title      TEXT NOT NULL DEFAULT 'Untitled',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE document_revisions (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id),
  blob_id     UUID NOT NULL REFERENCES blobs(id),
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX doc_revisions_doc_idx ON document_revisions(document_id, created_at);

-- ─── Post (mail) ──────────────────────────────────────────────────────────────

CREATE TABLE mail_threads (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  subject    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE mail_messages (
  id             UUID PRIMARY KEY,
  project_id     UUID NOT NULL REFERENCES projects(id),
  user_id        UUID NOT NULL REFERENCES users(id),
  thread_id      UUID REFERENCES mail_threads(id),
  -- NON-NEGOTIABLE: complete RFC 5322 message stored before any parsing
  raw_blob_id    UUID NOT NULL REFERENCES blobs(id),
  message_id_hdr TEXT,
  subject        TEXT,
  from_address   TEXT,
  to_addresses   TEXT[],
  cc_addresses   TEXT[],
  received_at    TIMESTAMPTZ NOT NULL,
  direction      TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  flags          TEXT[] NOT NULL DEFAULT '{}',
  labels         TEXT[] NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);
CREATE INDEX mail_messages_msgid_idx  ON mail_messages(message_id_hdr);
CREATE INDEX mail_messages_thread_idx ON mail_messages(thread_id);

-- ─── Schedule (calendar) ──────────────────────────────────────────────────────

CREATE TABLE calendar_events (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id),
  title       TEXT NOT NULL,
  description TEXT,
  all_day     BOOLEAN NOT NULL DEFAULT false,
  -- NON-NEGOTIABLE: UTC instant + originating timezone + rrule as written
  start_utc   TIMESTAMPTZ NOT NULL,
  start_tz    TEXT NOT NULL,
  end_utc     TIMESTAMPTZ NOT NULL,
  end_tz      TEXT NOT NULL,
  -- RFC 5545 RRULE verbatim; null for non-recurring events
  rrule       TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX cal_events_range_idx ON calendar_events(start_utc, end_utc);

CREATE TABLE calendar_event_exceptions (
  id                   UUID PRIMARY KEY,
  project_id           UUID NOT NULL REFERENCES projects(id),
  event_id             UUID NOT NULL REFERENCES calendar_events(id),
  occurrence_start_utc TIMESTAMPTZ NOT NULL,
  is_cancelled         BOOLEAN NOT NULL DEFAULT false,
  title                TEXT,
  start_utc            TIMESTAMPTZ,
  end_utc              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ,
  UNIQUE (event_id, occurrence_start_utc)
);

CREATE TABLE calendar_attendees (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  event_id   UUID NOT NULL REFERENCES calendar_events(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (event_id, user_id)
);

-- ─── Rooms (chat) ─────────────────────────────────────────────────────────────

CREATE TABLE channels (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  name       TEXT NOT NULL,
  topic      TEXT,
  is_dm      BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE channel_members (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  channel_id UUID NOT NULL REFERENCES channels(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (channel_id, user_id)
);

CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  channel_id UUID NOT NULL REFERENCES channels(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  parent_id  UUID,
  body       TEXT NOT NULL,
  edited_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX chat_messages_channel_idx ON chat_messages(channel_id, created_at);

-- ─── Search ───────────────────────────────────────────────────────────────────

CREATE TABLE search_index (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL,
  object_type TEXT NOT NULL,
  object_id   UUID NOT NULL,
  plain_text  TEXT NOT NULL,
  tsv         TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', plain_text)) STORED,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, object_type, object_id)
);
CREATE INDEX search_index_tsv_gin ON search_index USING GIN (tsv);
