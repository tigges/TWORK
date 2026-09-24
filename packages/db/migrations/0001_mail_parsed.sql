-- Parsed fields for Mail. The raw RFC 5322 blob is stored before these are filled.

ALTER TABLE mail_messages
  ADD COLUMN text_body   TEXT,
  ADD COLUMN in_reply_to TEXT,
  ADD COLUMN parsed_at   TIMESTAMPTZ;

CREATE UNIQUE INDEX mail_messages_user_blob_idx
  ON mail_messages (user_id, raw_blob_id)
  WHERE deleted_at IS NULL;

CREATE INDEX mail_messages_inbox_idx
  ON mail_messages (project_id, user_id, received_at DESC);
