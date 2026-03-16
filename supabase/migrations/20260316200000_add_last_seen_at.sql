-- Track actual last activity time instead of relying on Supabase Auth's last_sign_in_at
-- which only updates on explicit login, not session restoration.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON public.profiles(last_seen_at)
  WHERE last_seen_at IS NOT NULL;
