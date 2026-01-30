-- Add google_types column to store Google Place types for categorization
-- This helps Claude AI make better categorization decisions

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS google_types TEXT[];

-- Add index for potential filtering by Google types
CREATE INDEX IF NOT EXISTS idx_restaurants_google_types ON restaurants USING GIN (google_types);

COMMENT ON COLUMN restaurants.google_types IS 'Google Places API types array (e.g., italian_restaurant, bar, cafe)';
