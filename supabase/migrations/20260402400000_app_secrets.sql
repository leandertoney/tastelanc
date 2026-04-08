-- app_secrets: key-value store for large configuration values that exceed
-- Netlify's 4 KB environment variable limit.
-- Access is restricted to service-role only (no anon/authenticated reads).

CREATE TABLE IF NOT EXISTS public.app_secrets (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- No policies — only accessible via service role key (bypasses RLS)
-- Anonymous and authenticated users cannot read secrets
