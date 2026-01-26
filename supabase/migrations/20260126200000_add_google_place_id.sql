-- Add google_place_id column for Google Places API enrichment
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_place_id TEXT;
CREATE INDEX IF NOT EXISTS idx_restaurants_google_place_id ON restaurants(google_place_id);
