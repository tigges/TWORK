CREATE TABLE contacts (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id    UUID NOT NULL REFERENCES users(id),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX contacts_owner_idx ON contacts (project_id, user_id);

CREATE UNIQUE INDEX contacts_email_idx
  ON contacts (project_id, user_id, lower(email))
  WHERE deleted_at IS NULL;
