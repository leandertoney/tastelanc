-- Add instagram_handle column to restaurants table for outreach tracking
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram_handle_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram_followers INTEGER;
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram_found_at TIMESTAMPTZ;

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_instagram_handle ON restaurants (instagram_handle) WHERE instagram_handle IS NOT NULL;
