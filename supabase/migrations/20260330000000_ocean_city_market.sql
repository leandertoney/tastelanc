-- ============================================================
-- ADD OCEAN-CITY-MD MARKET
--
-- Adds TasteOceanCity (Ocean City, MD) as the fourth market.
-- Production-safe. Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================

INSERT INTO public.markets (
  name,
  slug,
  county,
  state,
  center_latitude,
  center_longitude,
  radius_miles,
  app_slug,
  ai_name,
  instagram_handle,
  app_store_url,
  play_store_url,
  logo_url
)
VALUES (
  'Ocean City',
  'ocean-city-md',
  'Worcester',
  'MD',
  38.3365,
  -75.0849,
  15,
  'taste-ocean-city',
  'Sandie',
  '@tasteoceancity',
  '',
  '',
  ''
)
ON CONFLICT (slug) DO NOTHING;
