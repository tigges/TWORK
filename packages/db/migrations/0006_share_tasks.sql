-- Who a file, contact, or event is shared with. The contact is the person, not a login.
CREATE TABLE IF NOT EXISTS shares (
  id          UUID PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id),
  object_type TEXT NOT NULL,
  object_id   UUID NOT NULL,
  contact_id  UUID NOT NULL REFERENCES contacts(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS shares_unique_idx
  ON shares (object_type, object_id, contact_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS shares_contact_idx
  ON shares (contact_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS tasks (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  done_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS tasks_owner_idx
  ON tasks (project_id, user_id)
  WHERE deleted_at IS NULL;
