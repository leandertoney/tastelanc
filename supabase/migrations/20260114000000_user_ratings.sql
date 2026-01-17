-- User Ratings System
-- Allows users to rate restaurants (1-5 stars) and earn points

-- Create user_ratings table
CREATE TABLE IF NOT EXISTS user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Add TasteLanc aggregate rating columns to restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tastelancrating DECIMAL(2,1);
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS tastelancrating_count INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can insert own ratings" ON user_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON user_ratings;
DROP POLICY IF EXISTS "Anyone can read ratings" ON user_ratings;

-- RLS policies
CREATE POLICY "Users can insert own ratings" ON user_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings" ON user_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read ratings" ON user_ratings
  FOR SELECT USING (true);

-- Trigger function to update restaurant aggregate rating
CREATE OR REPLACE FUNCTION update_restaurant_tastelancrating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE restaurants SET
    tastelancrating = (
      SELECT ROUND(AVG(rating)::numeric, 1)::DECIMAL(2,1)
      FROM user_ratings
      WHERE restaurant_id = NEW.restaurant_id
    ),
    tastelancrating_count = (
      SELECT COUNT(*)
      FROM user_ratings
      WHERE restaurant_id = NEW.restaurant_id
    ),
    updated_at = NOW()
  WHERE id = NEW.restaurant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_user_rating_change ON user_ratings;
CREATE TRIGGER on_user_rating_change
  AFTER INSERT OR UPDATE ON user_ratings
  FOR EACH ROW EXECUTE FUNCTION update_restaurant_tastelancrating();

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ratings_user_id ON user_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_restaurant_id ON user_ratings(restaurant_id);

-- Comments
COMMENT ON TABLE user_ratings IS 'User-submitted ratings for restaurants';
COMMENT ON COLUMN restaurants.tastelancrating IS 'Average rating from TasteLanc users';
COMMENT ON COLUMN restaurants.tastelancrating_count IS 'Number of TasteLanc user ratings';
