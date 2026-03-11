-- Add per-account Meta app credentials to support multiple Meta Apps (one per market)
-- Previously, token refresh used a single META_APP_ID/META_APP_SECRET from env vars.
-- Now each account stores its own app credentials for independent token refresh.

ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS meta_app_id TEXT;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS meta_app_secret TEXT;
