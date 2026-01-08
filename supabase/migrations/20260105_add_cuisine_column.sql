-- Add cuisine column to restaurants table
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS cuisine text;

-- Create index for faster cuisine queries
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine);
