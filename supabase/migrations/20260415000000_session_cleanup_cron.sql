-- Enable pg_cron extension (required for scheduled jobs on Supabase)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to delete expired sessions.
-- Called automatically by the cron job below so stale rows don't accumulate.
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
END;
$$;

-- Schedule the cleanup to run daily at 03:00 UTC.
-- The job uses the supabase_functions schema (default for pg_cron on Supabase).
SELECT cron.schedule(
  'clean-expired-sessions',
  '0 3 * * *',
  $$ SELECT clean_expired_sessions(); $$
);