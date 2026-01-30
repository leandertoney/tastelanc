-- Password setup tokens for new account invitations
-- These tokens allow users to set their password via our website instead of Supabase's email flow

CREATE TABLE IF NOT EXISTS public.password_setup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_token ON public.password_setup_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_password_setup_tokens_expires ON public.password_setup_tokens(expires_at);

-- RLS policies
ALTER TABLE public.password_setup_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (for security)
CREATE POLICY "Service role only" ON public.password_setup_tokens
  FOR ALL USING (false);

COMMENT ON TABLE public.password_setup_tokens IS 'Secure tokens for password setup invitations sent via Resend email';
