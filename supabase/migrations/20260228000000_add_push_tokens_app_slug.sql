-- Add app_slug column to push_tokens to distinguish tokens from different Expo projects.
-- Expo Push API rejects batch sends containing tokens from multiple projects
-- (PUSH_TOO_MANY_EXPERIENCE_IDS), so we must send separate batches per project.

ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS app_slug TEXT;

-- Backfill: tokens created before TasteCumberland launch (Feb 16) are all TasteLanc
UPDATE push_tokens SET app_slug = 'tastelanc' WHERE app_slug IS NULL AND updated_at < '2026-02-16';

CREATE INDEX IF NOT EXISTS idx_push_tokens_app_slug ON push_tokens(app_slug);
