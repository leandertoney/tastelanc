-- ============================================================
-- OCEAN CITY AREAS (NEIGHBORHOOD ZONES)
--
-- Inserts the 4 Ocean City neighborhoods into the areas table.
-- market_id is resolved via a subquery so this migration is
-- safe to run independently of knowing the UUID.
-- ============================================================

INSERT INTO public.areas (name, slug, description, latitude, longitude, radius, market_id)
SELECT
  t.name, t.slug, t.description, t.latitude, t.longitude, t.radius,
  (SELECT id FROM public.markets WHERE slug = 'ocean-city-md')
FROM (VALUES
  (
    'Boardwalk',
    'oc-boardwalk',
    'The iconic Ocean City Boardwalk, Inlet area, and downtown restaurant corridor',
    38.3365,
    -75.0849,
    1200
  ),
  (
    'Midtown',
    'oc-midtown',
    '28th to 65th Street commercial dining and entertainment corridor',
    38.3600,
    -75.0800,
    1400
  ),
  (
    'Uptown',
    'oc-uptown',
    '65th to 146th Street north end restaurant and resort corridor',
    38.3850,
    -75.0730,
    1600
  ),
  (
    'West Ocean City',
    'oc-west',
    'Mainland Route 50 corridor with bay-side restaurants and marina dining',
    38.3400,
    -75.1200,
    1800
  )
) AS t(name, slug, description, latitude, longitude, radius)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  latitude    = EXCLUDED.latitude,
  longitude   = EXCLUDED.longitude,
  radius      = EXCLUDED.radius,
  market_id   = EXCLUDED.market_id;
