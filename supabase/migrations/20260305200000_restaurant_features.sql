-- Add features/amenities column for discoverable restaurant attributes
-- Examples: private_dining, live_piano, heated_patio, wheelchair_accessible
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS features TEXT[] DEFAULT '{}';

-- GIN index for efficient array containment queries (same pattern as categories)
CREATE INDEX IF NOT EXISTS idx_restaurants_features ON public.restaurants USING GIN (features);
