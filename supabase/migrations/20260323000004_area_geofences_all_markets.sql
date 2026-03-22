-- Migration: area_geofences_all_markets
-- Adds market_id to areas table and seeds Cumberland + Fayetteville neighborhoods

-- =====================
-- ADD MARKET_ID TO AREAS
-- =====================

ALTER TABLE public.areas
  ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id);

-- Index for fast per-market lookups
CREATE INDEX IF NOT EXISTS idx_areas_market_id ON public.areas(market_id);

-- Update existing Lancaster areas with Lancaster market_id
UPDATE public.areas
  SET market_id = 'f7e72800-3d4c-4f68-af22-40b1d52dc2e5'
  WHERE market_id IS NULL;

-- =====================
-- CUMBERLAND COUNTY AREAS
-- =====================

INSERT INTO public.areas (name, slug, description, latitude, longitude, radius, market_id) VALUES
  ('Downtown Carlisle',     'carlisle-downtown',    'Historic downtown Carlisle with restaurants, shops, and Dickinson College area', 40.2015, -77.1988, 750,  '0602afe2-fae2-4e46-af2c-7b374bfc9d45'),
  ('Mechanicsburg',         'mechanicsburg',         'Mechanicsburg borough dining and entertainment corridor',                        40.2142, -77.0086, 750,  '0602afe2-fae2-4e46-af2c-7b374bfc9d45'),
  ('Camp Hill',             'camp-hill',             'Camp Hill shopping and dining district along Market Street',                     40.2387, -76.9219, 700,  '0602afe2-fae2-4e46-af2c-7b374bfc9d45'),
  ('Hampden Township',      'hampden-township',      'Enola and Hampden Township commercial dining corridor',                          40.2776, -76.9497, 900,  '0602afe2-fae2-4e46-af2c-7b374bfc9d45'),
  ('Shippensburg',          'shippensburg',          'Shippensburg University area dining and downtown',                               40.0501, -77.5211, 700,  '0602afe2-fae2-4e46-af2c-7b374bfc9d45'),
  ('Newville Corridor',     'newville',              'Newville and Big Spring area local dining',                                      40.1748, -77.4014, 600,  '0602afe2-fae2-4e46-af2c-7b374bfc9d45')
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  latitude    = EXCLUDED.latitude,
  longitude   = EXCLUDED.longitude,
  radius      = EXCLUDED.radius,
  market_id   = EXCLUDED.market_id;

-- =====================
-- FAYETTEVILLE AREAS
-- =====================

INSERT INTO public.areas (name, slug, description, latitude, longitude, radius, market_id) VALUES
  ('Downtown Fayetteville', 'fay-downtown',          'Historic downtown Fayetteville with Market House and restaurants',               35.0527, -78.8784, 800,  'c7b79d18-0bb6-434d-926a-0f8cdf420acb'),
  ('Haymount',              'fay-haymount',          'Haymount historic neighborhood dining and nightlife',                            35.0600, -78.9050, 700,  'c7b79d18-0bb6-434d-926a-0f8cdf420acb'),
  ('Cross Creek',           'fay-cross-creek',       'Cross Creek Mall corridor and surrounding dining',                               35.0450, -78.9350, 1000, 'c7b79d18-0bb6-434d-926a-0f8cdf420acb'),
  ('Yadkin Road Corridor',  'fay-yadkin',            'Yadkin Road commercial and dining district',                                    35.0950, -78.9250, 900,  'c7b79d18-0bb6-434d-926a-0f8cdf420acb'),
  ('Fort Liberty Area',     'fay-fort-liberty',      'Restaurants and dining near Fort Liberty (formerly Fort Bragg)',                 35.1450, -79.0050, 1000, 'c7b79d18-0bb6-434d-926a-0f8cdf420acb'),
  ('Hope Mills',            'fay-hope-mills',        'Hope Mills town center and local dining',                                       34.9687, -78.9450, 800,  'c7b79d18-0bb6-434d-926a-0f8cdf420acb')
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  latitude    = EXCLUDED.latitude,
  longitude   = EXCLUDED.longitude,
  radius      = EXCLUDED.radius,
  market_id   = EXCLUDED.market_id;
