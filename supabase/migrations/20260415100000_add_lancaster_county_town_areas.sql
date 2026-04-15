-- Add Lancaster County town area definitions for map boundaries and geofencing
-- Created: 2026-04-15
-- Purpose: Enable color-coded map boundaries for all significant Lancaster County towns

-- Get Lancaster market ID for reference
DO $$
DECLARE
  lancaster_market_id UUID;
BEGIN
  SELECT id INTO lancaster_market_id FROM markets WHERE slug = 'lancaster-pa';

  -- LITITZ - 62 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Lititz',
    'lititz-town',
    40.155266,
    -76.299195,
    2000, -- 2km radius (~1.2 miles)
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- EPHRATA - 52 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Ephrata',
    'ephrata',
    40.321606,
    -77.018538,
    2000,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- ELIZABETHTOWN - 43 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Elizabethtown',
    'elizabethtown',
    40.026986,
    -76.651789,
    2000,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- MANHEIM - 28 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Manheim',
    'manheim-town',
    40.161012,
    -76.399827,
    1750, -- Slightly smaller
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- LEOLA - 18 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Leola',
    'leola',
    40.091225,
    -76.194210,
    1500,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- RONKS - 12 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Ronks',
    'ronks',
    40.012305,
    -76.163295,
    1500,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- MILLERSVILLE - 6 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Millersville',
    'millersville',
    40.002403,
    -76.356980,
    1250,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- STRASBURG - 5 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Strasburg',
    'strasburg',
    39.983268,
    -76.173768,
    1250,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- EAST PETERSBURG - 4 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'East Petersburg',
    'east-petersburg',
    40.097000,
    -76.352547,
    1250,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- COLUMBIA - 4 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Columbia',
    'columbia',
    40.041622,
    -76.493015,
    1250,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- BIRD IN HAND - 4 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Bird in Hand',
    'bird-in-hand',
    40.042815,
    -76.159870,
    1250,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

  -- WILLOW STREET - 4 restaurants
  INSERT INTO areas (id, name, slug, latitude, longitude, radius, market_id, is_active, created_at, updated_at)
  VALUES (
    gen_random_uuid(),
    'Willow Street',
    'willow-street',
    39.986643,
    -76.281492,
    1250,
    lancaster_market_id,
    true,
    NOW(),
    NOW()
  ) ON CONFLICT (slug) DO NOTHING;

END $$;

-- Verify insertion
SELECT name, slug, radius, is_active
FROM areas
WHERE market_id = (SELECT id FROM markets WHERE slug = 'lancaster-pa')
ORDER BY name;
