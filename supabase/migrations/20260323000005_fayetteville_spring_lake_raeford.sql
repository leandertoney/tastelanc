-- Migration: fayetteville_spring_lake_raeford
-- Adds Spring Lake and Raeford neighborhood areas for TasteFayetteville

INSERT INTO public.areas (name, slug, description, latitude, longitude, radius, market_id) VALUES
  ('Spring Lake',  'fay-spring-lake', 'Spring Lake town dining near Fort Liberty gate',  35.1878, -78.9726, 800,  'c7b79d18-0bb6-434d-926a-0f8cdf420acb'),
  ('Raeford',      'fay-raeford',     'Raeford local dining in Hoke County',              34.9776, -79.2244, 750,  'c7b79d18-0bb6-434d-926a-0f8cdf420acb')
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  latitude    = EXCLUDED.latitude,
  longitude   = EXCLUDED.longitude,
  radius      = EXCLUDED.radius,
  market_id   = EXCLUDED.market_id;
