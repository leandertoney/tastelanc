-- Team review votes on expansion cities
-- Allows founders to vote (interested, not_now, reject) from email links

CREATE TABLE IF NOT EXISTS expansion_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  city_id UUID NOT NULL REFERENCES expansion_cities(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('interested', 'not_now', 'reject')),
  note TEXT,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(city_id, reviewer_email)
);

-- Add review consensus status to expansion_cities
ALTER TABLE expansion_cities
  ADD COLUMN IF NOT EXISTS review_status TEXT DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review', 'consensus_interested', 'consensus_not_now', 'split_decision', 'consensus_reject'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expansion_reviews_city ON expansion_reviews(city_id);
CREATE INDEX IF NOT EXISTS idx_expansion_reviews_email ON expansion_reviews(reviewer_email);

-- Add 'review_vote' to activity log action constraint
ALTER TABLE expansion_activity_log DROP CONSTRAINT IF EXISTS expansion_activity_log_action_check;
ALTER TABLE expansion_activity_log ADD CONSTRAINT expansion_activity_log_action_check CHECK (action IN (
  'city_added', 'research_started', 'research_completed',
  'brand_generated', 'brand_selected', 'brand_regenerated',
  'job_listing_generated', 'job_listing_approved', 'job_listing_rejected',
  'city_approved', 'city_rejected', 'city_put_on_hold',
  'market_created', 'status_changed', 'note_added',
  'review_vote', 'job_posted', 'application_received'
));
