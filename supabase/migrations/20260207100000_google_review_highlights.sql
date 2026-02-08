-- Add Google review data fields to restaurants
-- Used for evidence-based recommendation badges

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS google_rating DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS google_review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_review_highlights TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_reviews_synced_at TIMESTAMPTZ;

-- Index for quick lookups of restaurants with review data
CREATE INDEX IF NOT EXISTS idx_restaurants_google_rating
  ON restaurants (google_rating)
  WHERE google_rating IS NOT NULL;
