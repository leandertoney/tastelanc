-- Add logo_url to markets table and populate with app icon URLs from Supabase Storage.
-- These are the recognizable app icons shown in cross-market promo cards.

ALTER TABLE markets ADD COLUMN IF NOT EXISTS logo_url TEXT;

UPDATE markets SET logo_url = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/market-logos/tastelanc-icon.png'
WHERE slug = 'lancaster-pa';

UPDATE markets SET logo_url = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/market-logos/tastecumberland-icon.png'
WHERE slug = 'cumberland-pa';

UPDATE markets SET logo_url = 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/market-logos/tastefayetteville-icon.png'
WHERE slug = 'fayetteville-nc';

-- Update get_markets_with_instagram() to also return logo_url
-- Must drop first because return type is changing
DROP FUNCTION IF EXISTS get_markets_with_instagram();
CREATE OR REPLACE FUNCTION get_markets_with_instagram()
RETURNS TABLE (
  id               UUID,
  name             TEXT,
  slug             TEXT,
  instagram_handle TEXT,
  app_store_url    TEXT,
  play_store_url   TEXT,
  logo_url         TEXT
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
    m.play_store_url,
    m.logo_url
  FROM markets m
  INNER JOIN instagram_accounts ia ON ia.market_id = m.id
  WHERE ia.is_active = true
    AND m.instagram_handle IS NOT NULL
  ORDER BY m.name;
$$;
