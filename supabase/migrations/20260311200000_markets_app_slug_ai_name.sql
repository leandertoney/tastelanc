-- Add app_slug and ai_name to markets table so notification code
-- can read from DB instead of hardcoded mappings.
ALTER TABLE markets ADD COLUMN IF NOT EXISTS app_slug TEXT;
ALTER TABLE markets ADD COLUMN IF NOT EXISTS ai_name TEXT;

UPDATE markets SET app_slug = 'tastelanc', ai_name = 'Rosie' WHERE slug = 'lancaster-pa' AND app_slug IS NULL;
UPDATE markets SET app_slug = 'taste-cumberland', ai_name = 'Mollie' WHERE slug = 'cumberland-pa' AND app_slug IS NULL;
UPDATE markets SET app_slug = 'taste-fayetteville', ai_name = 'Libertie' WHERE slug = 'fayetteville-nc' AND app_slug IS NULL;
