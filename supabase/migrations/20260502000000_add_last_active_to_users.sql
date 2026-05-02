ALTER TABLE users ADD COLUMN last_active_at TIMESTAMPTZ;

-- Backfill from sessions (most recent session per user)
UPDATE users u
SET last_active_at = s.last_active_at
FROM (
  SELECT DISTINCT ON (user_id) user_id, last_active_at
  FROM sessions
  ORDER BY user_id, last_active_at DESC
) s
WHERE u.id = s.user_id;
