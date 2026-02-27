-- Add custom_description column for owner-written descriptions
-- that supersede AI-generated descriptions
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS custom_description TEXT;
COMMENT ON COLUMN restaurants.custom_description IS 'Owner-written description that supersedes the AI-generated description';
