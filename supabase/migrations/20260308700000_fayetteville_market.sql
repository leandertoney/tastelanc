-- ============================================================
-- ADD FAYETTEVILLE-NC MARKET
--
-- Adds TasteFayetteville (Fayetteville, NC) as the third market.
-- Production-safe. Idempotent via ON CONFLICT DO NOTHING.
-- ============================================================

INSERT INTO public.markets (name, slug, county, state, center_latitude, center_longitude, radius_miles)
VALUES (
  'Fayetteville',
  'fayetteville-nc',
  'Cumberland',
  'NC',
  35.0527,
  -78.8784,
  20
)
ON CONFLICT (slug) DO NOTHING;
