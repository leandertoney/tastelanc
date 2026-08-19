-- The Gloomy Rooster changed companies and rebranded completely as
-- The Brazen Bull Pizza Co. (same space inside Southern Market, 100 S Queen St).
--
-- This updates the existing listing in place rather than creating a new row so
-- the paid tier slot, owner account, check-in history, and check-in PIN survive.
-- Source of new details: https://www.brazenbullpizza.com
--
-- NOTE: owner_id and stripe_subscription_id are intentionally NOT touched here.
-- Whether the previous owner's subscription carries over to the new operator is
-- a business decision, not a data migration.
DO $$
DECLARE
  brazen_bull_id UUID := 'a0bcf79a-0ee7-438e-a056-d2f51b973d40';
BEGIN
  UPDATE public.restaurants SET
    name             = 'The Brazen Bull Pizza Co.',
    slug             = 'the-brazen-bull-pizza-co',
    description      = 'Lancaster''s first Roman style pizza, served al taglio (by the cut) all day from full rectangular pans, alongside 12" neo-Neapolitan round pies. The dough is a custom flour blend with a sourdough starter, cold fermented 24 to 72 hours. The chef trained at The Breslin, Roberta''s, and Cafe Altro Paradiso in NYC before bringing Roman slices home to Lancaster. Located inside Southern Market.',
    rw_description   = 'Lancaster''s first Roman style pizza, served al taglio (by the cut) all day from full rectangular pans, alongside 12" neo-Neapolitan round pies. Dough is cold fermented 24 to 72 hours with a sourdough starter. Located inside Southern Market.',
    categories       = ARRAY['pizza', 'lunch', 'dinner', 'casual'],
    cuisine          = 'Pizza',
    website          = 'https://www.brazenbullpizza.com',
    phone            = '717-490-8344',
    business_email   = 'contact@brazenbullpizza.com',
    contact_email    = 'contact@brazenbullpizza.com',
    instagram_handle = 'brazenbullpizza',
    instagram_handle_verified = false,
    signature_dishes = ARRAY['Roman Style Pizza by the Cut', 'Full Rectangular Pans', '12" Neo-Neapolitan Round Pies'],
    vibe_tags        = ARRAY['casual', 'food-hall', 'trendy'],
    best_for         = ARRAY['lunch', 'dinner', 'quick-bite'],
    -- old branding + ratings/reviews belonged to the previous concept
    cover_image_url  = NULL,
    google_place_id  = NULL,
    google_rating    = NULL,
    google_review_count = 0,
    google_review_highlights = '{}',
    google_reviews_synced_at = NULL,
    tastelancrating  = NULL,
    tastelancrating_count = 0
  WHERE id = brazen_bull_id;

  -- New hours per brazenbullpizza.com: Wed-Thu 11-8, Fri-Sat 11-9, Sun 11-6, Mon-Tue closed
  UPDATE public.restaurant_hours SET open_time = NULL, close_time = NULL, is_closed = true
   WHERE restaurant_id = brazen_bull_id AND day_of_week IN ('monday', 'tuesday');
  UPDATE public.restaurant_hours SET open_time = '11:00', close_time = '20:00', is_closed = false
   WHERE restaurant_id = brazen_bull_id AND day_of_week IN ('wednesday', 'thursday');
  UPDATE public.restaurant_hours SET open_time = '11:00', close_time = '21:00', is_closed = false
   WHERE restaurant_id = brazen_bull_id AND day_of_week IN ('friday', 'saturday');
  UPDATE public.restaurant_hours SET open_time = '11:00', close_time = '18:00', is_closed = false
   WHERE restaurant_id = brazen_bull_id AND day_of_week = 'sunday';

  -- The imported Gloomy Rooster PDF menu no longer applies. Hidden, not deleted.
  UPDATE public.menus SET is_active = false, is_hidden_from_tab = true
   WHERE restaurant_id = brazen_bull_id;

  -- All 7 photos were the previous concept: the cartoon rooster logo plus
  -- fried chicken sandwiches / tenders (one carrying a Restaurant Week overlay).
  -- None are usable for a pizza shop, so the rows are removed. The new operator
  -- uploads their own; storage objects are left in place.
  DELETE FROM public.restaurant_photos
   WHERE restaurant_id = brazen_bull_id;
END $$;
