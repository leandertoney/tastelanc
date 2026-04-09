-- Add sort_order column to holiday_specials for manual deal ordering within a restaurant
ALTER TABLE public.holiday_specials
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_holiday_specials_sort_order
  ON public.holiday_specials(restaurant_id, sort_order);
