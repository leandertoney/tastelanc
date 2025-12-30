-- Create favorites table for users to save restaurants
-- Note: Table may already exist from previous setup
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Enable RLS (safe to run multiple times)
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
DROP POLICY IF EXISTS "Users can remove own favorites" ON favorites;
DROP POLICY IF EXISTS "Admin can read all favorites" ON favorites;

-- Policy: Users can view their own favorites
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can add favorites
CREATE POLICY "Users can add favorites" ON favorites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own favorites
CREATE POLICY "Users can remove own favorites" ON favorites
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Admin can read all favorites
CREATE POLICY "Admin can read all favorites" ON favorites
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant_id ON favorites(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC);
