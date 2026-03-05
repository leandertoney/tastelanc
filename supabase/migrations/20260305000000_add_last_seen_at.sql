-- Add last_seen_at to profiles for tracking active vs dormant app users
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NULL;
