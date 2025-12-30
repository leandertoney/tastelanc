-- Originally: Expand restaurant_category enum with new cuisine types
-- This migration is now a no-op because we use TEXT[] arrays for categories
-- instead of an enum type, which provides more flexibility without migrations.

-- No changes needed - TEXT[] categories support any string values
SELECT 1;
