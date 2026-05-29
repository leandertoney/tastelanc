-- Add has_pick_badge field to restaurants table
-- This badge is now independent of subscription tier and manually granted

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS has_pick_badge BOOLEAN DEFAULT false;

-- Create index for efficient querying of Pick badge restaurants
CREATE INDEX IF NOT EXISTS idx_restaurants_pick_badge
ON public.restaurants(has_pick_badge)
WHERE has_pick_badge = true;

-- Grant Pick badge to Marion Court Room and Station House Tavern
-- These restaurants earned the badge: Marion Court (Elite legacy), Station House (2-year commitment)

UPDATE public.restaurants
SET has_pick_badge = true
WHERE id IN (
  '6304c5cf-bdf3-413c-9fff-592562a1ddde', -- Marion Court Room
  '9134761b-5eb3-4801-ba17-e5fa37de7c08'  -- Station House Tavern & Sports Bar
);

-- Add comment documenting the field
COMMENT ON COLUMN public.restaurants.has_pick_badge IS
'Manually awarded TasteLanc Pick badge - independent of subscription tier. Displayed as gold star badge in mobile apps.';
