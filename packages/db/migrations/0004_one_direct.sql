-- One direct thread per project. Named rooms are not direct threads.
CREATE UNIQUE INDEX IF NOT EXISTS channels_one_dm_idx
  ON channels (project_id)
  WHERE is_dm AND deleted_at IS NULL;
