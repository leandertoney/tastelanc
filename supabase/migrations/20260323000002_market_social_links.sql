-- Market social links: instagram handle, App Store URL, Play Store URL
-- These columns are the public-facing identifiers for each market.
-- Used by the mobile "Explore Other Cities" feature to surface sister apps
-- to users who may be traveling to other markets.

ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,   -- e.g. '@tastelanc'
  ADD COLUMN IF NOT EXISTS app_store_url    TEXT,   -- iOS App Store link
  ADD COLUMN IF NOT EXISTS play_store_url   TEXT;   -- Google Play link

-- Populate existing markets
UPDATE markets SET
  instagram_handle = '@tastelanc',
  app_store_url    = 'https://apps.apple.com/app/tastelanc/id6755852717',
  play_store_url   = ''
WHERE slug = 'lancaster-pa';

UPDATE markets SET
  instagram_handle = '@tastecumberland',
  app_store_url    = 'https://apps.apple.com/us/app/tastecumberland/id6759233248',
  play_store_url   = 'https://play.google.com/store/apps/details?id=com.tastelanc.cumberland'
WHERE slug = 'cumberland-pa';

UPDATE markets SET
  instagram_handle = '@tastefayetteville',
  app_store_url    = 'https://apps.apple.com/us/app/tastefayetteville/id6760276128',
  play_store_url   = 'https://play.google.com/store/apps/details?id=com.tastelanc.fayetteville'
WHERE slug = 'fayetteville-nc';

-- ─── RPC: get_markets_with_instagram ──────────────────────────────────────────
--
-- Returns markets that have an ACTIVE Instagram account connected,
-- exposing only non-sensitive columns (no tokens, no secrets).
-- Callable with the anon key from the mobile app.
--
-- AUTO-UPDATES: adding a new market's instagram_accounts row with
-- is_active = true (and populating markets.instagram_handle) is all that's
-- needed for that market to appear in the "Explore Other Cities" section.
-- No code changes required.

CREATE OR REPLACE FUNCTION get_markets_with_instagram()
RETURNS TABLE (
  id               UUID,
  name             TEXT,
  slug             TEXT,
  instagram_handle TEXT,
  app_store_url    TEXT,
  play_store_url   TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    m.id,
    m.name,
    m.slug,
    m.instagram_handle,
    m.app_store_url,
    m.play_store_url
  FROM markets m
  INNER JOIN instagram_accounts ia ON ia.market_id = m.id
  WHERE ia.is_active = true
    AND m.instagram_handle IS NOT NULL
  ORDER BY m.name;
$$;
