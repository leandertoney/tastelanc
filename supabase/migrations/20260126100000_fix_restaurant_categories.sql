-- =====================================================
-- Fix restaurant category/cuisine data quality issues
-- Identified by itinerary generator audit (2026-01-26)
-- =====================================================

-- ─── CONFIDENT FIXES ────────────────────────────────

-- 1. Remove 'brunch' from restaurants that clearly don't serve brunch
-- These are Chinese, ramen, and seafood/steak restaurants that were incorrectly tagged.

-- Good Taste Chinese Restaurant — Chinese food, not a brunch spot
UPDATE restaurants
SET categories = array_remove(categories, 'brunch'),
    updated_at = now()
WHERE id = '0c564810-63fc-4776-9dce-3292943bc9f6';

-- Alchemy Ramen — a ramen shop, not a brunch spot
UPDATE restaurants
SET categories = array_remove(categories, 'brunch'),
    updated_at = now()
WHERE id = '85eabe21-a990-4528-a665-362d94344a77';

-- Juicy Crab Seafood & Steak — seafood/steak, not a brunch spot
UPDATE restaurants
SET categories = array_remove(categories, 'brunch'),
    updated_at = now()
WHERE id = 'aadbe7f1-a018-46f6-9f4a-b27ab87196eb';

-- 2. Fix incorrect brewery cuisines
-- These breweries were auto-categorized with wrong cuisine types.

-- St Boniface Craft Brewing Co — listed as 'italian', should be 'pub_fare'
UPDATE restaurants
SET cuisine = 'pub_fare',
    updated_at = now()
WHERE id = 'bec2e865-12b9-469e-8130-5ed98fe72cd8';

-- Bespoke Brewing — listed as 'asian', should be 'pub_fare'
UPDATE restaurants
SET cuisine = 'pub_fare',
    updated_at = now()
WHERE id = '7f094870-9ad6-4155-ac2c-8d65ffc6875b';

-- Lancaster Brewing Company Taproom & Grill — listed as 'italian', should be 'pub_fare'
UPDATE restaurants
SET cuisine = 'pub_fare',
    updated_at = now()
WHERE id = '0aa81930-b4ad-4d0b-a136-a5ab52e91b97';


-- ─── FLAGGED FOR MANUAL REVIEW ──────────────────────
-- The restaurants below have 'brunch' but are Asian cuisine.
-- Some may legitimately serve brunch (e.g., dim sum, pho is traditional breakfast).
-- Review each and remove 'brunch' if they don't actually serve breakfast/brunch.

-- Hippo Bubble Tea (id: 9975fa23-0117-4f22-91a8-3c4533f17496) — bubble tea, probably not brunch
-- Rice & Noodles Restaurant (id: e1e74bb5-367f-4d77-a98b-c25a9c6fe28d) — noodles, possibly not brunch
-- SPROUT of Rice & Noodles Vietnamese Eatery (id: 11a65a4e-b267-4fc8-ac26-a207cffc2281) — Vietnamese, pho could be breakfast
-- Yang's (id: a467b460-71cb-438f-ae94-984ee2b81f2b) — Asian, unclear
-- Issei Noodle (id: 30847da0-863c-43fe-8073-e2108aea6be1) — noodle bar, probably not brunch

-- Uncomment these after manual review if the restaurant does NOT serve brunch:
-- UPDATE restaurants SET categories = array_remove(categories, 'brunch'), updated_at = now() WHERE id = '9975fa23-0117-4f22-91a8-3c4533f17496'; -- Hippo Bubble Tea
-- UPDATE restaurants SET categories = array_remove(categories, 'brunch'), updated_at = now() WHERE id = 'e1e74bb5-367f-4d77-a98b-c25a9c6fe28d'; -- Rice & Noodles Restaurant
-- UPDATE restaurants SET categories = array_remove(categories, 'brunch'), updated_at = now() WHERE id = '11a65a4e-b267-4fc8-ac26-a207cffc2281'; -- SPROUT Vietnamese
-- UPDATE restaurants SET categories = array_remove(categories, 'brunch'), updated_at = now() WHERE id = 'a467b460-71cb-438f-ae94-984ee2b81f2b'; -- Yang's
-- UPDATE restaurants SET categories = array_remove(categories, 'brunch'), updated_at = now() WHERE id = '30847da0-863c-43fe-8073-e2108aea6be1'; -- Issei Noodle


-- ─── BROADER DATA QUALITY NOTE ──────────────────────
-- 146 of 447 active restaurants (33%) have the 'brunch' category.
-- 32 restaurants have 5+ categories (over-categorized).
-- 119 restaurants have EMPTY categories.
-- 272 of 447 (61%) have 'american_contemporary' cuisine (catch-all default).
--
-- Consider a broader data review to:
-- 1. Remove 'brunch' from restaurants that don't actually serve breakfast/brunch
-- 2. Assign categories to the 119 restaurants with empty categories
-- 3. Review restaurants with 6 categories (likely auto-categorized too broadly)
-- 4. Diversify cuisine types away from the 'american_contemporary' default
