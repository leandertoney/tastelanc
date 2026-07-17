-- Add is_lrw field to restaurants table for the Lancaster Restaurant Week badge.
-- Restaurant Week ended in April 2026, so the badge is OFF for everyone by default.
-- Admins toggle this per-restaurant when a future Restaurant Week runs. The mobile
-- badge (useRestaurantWeekIds) now reads this column instead of deriving membership
-- from holiday_specials rows.

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS is_lrw BOOLEAN DEFAULT false;

-- Index for efficient querying of restaurants currently in Restaurant Week
CREATE INDEX IF NOT EXISTS idx_restaurants_is_lrw
ON public.restaurants(is_lrw)
WHERE is_lrw = true;

COMMENT ON COLUMN public.restaurants.is_lrw IS
'Manually toggled Lancaster Restaurant Week badge - admin-controlled per restaurant. '
'Defaults to false (RW ended April 2026); admins re-enable per restaurant for future weeks.';
