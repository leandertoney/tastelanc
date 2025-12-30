-- Add reservation_links column to restaurants table
-- For future OpenTable/Resy integration

ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS reservation_links text;
COMMENT ON COLUMN restaurants.reservation_links IS 'OpenTable/Resy reservation URL for future use';
