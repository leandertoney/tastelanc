-- Add restaurant-week-specific description field to restaurants.
-- This is populated by the scraper script (scripts/scrape-restaurant-week-descriptions.ts)
-- and shows on the back of the flipped card in the Restaurant Week tab.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS rw_description text;

COMMENT ON COLUMN restaurants.rw_description IS
  'Description pulled from the official Restaurant Week website for the participating restaurant. Shown on the card flip in the app.';
