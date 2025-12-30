-- Add enrichment fields to restaurants table for richer blog content
-- These fields help Rosie write more specific, valuable blog posts

-- Price range indicator ($, $$, $$$, $$$$)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS price_range text;

-- Signature dishes - what the restaurant is known for
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS signature_dishes text[];

-- Vibe/atmosphere tags
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS vibe_tags text[];

-- Best for occasions
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS best_for text[];

-- Neighborhood (more specific than city)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS neighborhood text;

-- Parking information
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS parking_info text;

-- Noise level
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS noise_level text;

-- Average rating from Google/reviews
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS average_rating decimal(2,1);

-- Add comments for documentation
COMMENT ON COLUMN restaurants.price_range IS 'Price indicator: $, $$, $$$, or $$$$';
COMMENT ON COLUMN restaurants.signature_dishes IS 'Array of signature dishes the restaurant is known for';
COMMENT ON COLUMN restaurants.vibe_tags IS 'Array of atmosphere tags like romantic, loud, intimate, trendy';
COMMENT ON COLUMN restaurants.best_for IS 'Array of occasions like date-night, families, groups, solo';
COMMENT ON COLUMN restaurants.neighborhood IS 'Specific neighborhood like Downtown Lancaster, Lititz, etc.';
COMMENT ON COLUMN restaurants.parking_info IS 'Parking description like Street parking, Free lot, Valet';
COMMENT ON COLUMN restaurants.noise_level IS 'Noise level: quiet, moderate, loud';
COMMENT ON COLUMN restaurants.average_rating IS 'Average rating from reviews (e.g., 4.5)';
