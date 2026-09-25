-- Extra addresses live on the card. email and phone stay the first of each list.
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phones TEXT[] NOT NULL DEFAULT '{}';

UPDATE contacts
SET emails = ARRAY[lower(email)]
WHERE cardinality(emails) = 0
  AND email IS NOT NULL
  AND btrim(email) <> '';

UPDATE contacts
SET phones = ARRAY[btrim(phone)]
WHERE cardinality(phones) = 0
  AND phone IS NOT NULL
  AND btrim(phone) <> '';

-- People in a chat. A named room has no rows here.
CREATE TABLE IF NOT EXISTS channel_parties (
  id         UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  channel_id UUID NOT NULL REFERENCES channels(id),
  contact_id UUID NOT NULL REFERENCES contacts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS channel_parties_pair_idx
  ON channel_parties (channel_id, contact_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS channel_parties_contact_idx
  ON channel_parties (contact_id)
  WHERE deleted_at IS NULL;
