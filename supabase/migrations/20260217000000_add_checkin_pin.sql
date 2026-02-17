-- Add checkin_pin column to restaurants table
-- Default '1987' preserves current behavior for existing restaurants
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS checkin_pin text DEFAULT '1987';
