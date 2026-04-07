-- Instagram Restaurant Spotlight Post Type
-- Adds 'restaurant_spotlight' to the content_type CHECK constraint.
-- Also fixes the missing 'party_teaser' type (it was being inserted without
-- being in the constraint, which works only because the constraint was never
-- enforced on that value in production — this makes it official).

-- Drop and recreate the CHECK constraint to include the new types
ALTER TABLE public.instagram_posts
  DROP CONSTRAINT IF EXISTS instagram_posts_content_type_check;

ALTER TABLE public.instagram_posts
  ADD CONSTRAINT instagram_posts_content_type_check
  CHECK (content_type IN (
    'tonight_today',
    'weekend_preview',
    'category_roundup',
    'upcoming_events',
    'party_teaser',
    'restaurant_spotlight'
  ));

-- Index for spotlight recency queries (used by fetchSpotlightCandidates)
CREATE INDEX IF NOT EXISTS idx_ig_posts_spotlight_market
  ON public.instagram_posts (market_id, content_type, post_date DESC)
  WHERE content_type = 'restaurant_spotlight';
