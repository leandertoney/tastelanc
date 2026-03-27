-- Add The Gloomy Rooster (Southern Market, Lancaster) to the restaurants table
DO $$
DECLARE
  lancaster_market_id UUID;
  basic_tier_id       UUID := '00000000-0000-0000-0000-000000000001';
  gloomy_rooster_id   UUID := 'a1b2c3d4-gr00-4000-8000-000000000001';
BEGIN
  SELECT id INTO lancaster_market_id
    FROM public.markets
   WHERE slug = 'lancaster-pa'
   LIMIT 1;

  IF lancaster_market_id IS NULL THEN
    RAISE EXCEPTION 'Lancaster market not found';
  END IF;

  INSERT INTO public.restaurants (
    id, market_id, tier_id,
    name, slug,
    address, city, state, zip_code,
    latitude, longitude,
    categories,
    description,
    price_range,
    vibe_tags,
    best_for,
    signature_dishes,
    is_active, is_verified,
    checkin_pin
  ) VALUES (
    gloomy_rooster_id,
    lancaster_market_id,
    basic_tier_id,
    'The Gloomy Rooster',
    'the-gloomy-rooster-lancaster',
    '100 S Queen St', 'Lancaster', 'PA', '17603',
    40.0368, -76.3061,
    ARRAY['sandwiches', 'american', 'fried_chicken'],
    'Crave-worthy fried chicken sandwiches and house-made fries with bold, unexpected flavors. Located inside Southern Market, chef Chris Grove brings experience from Hawaii, NYC, and Nashville to Lancaster. Vegan-friendly options available.',
    '$$',
    ARRAY['casual', 'food-hall', 'trendy'],
    ARRAY['lunch', 'dinner', 'quick-bite'],
    ARRAY['Fried Chicken Sandwich', 'House-Made Fries', 'Fried Mushroom Sandwich'],
    true,
    false,
    '1987'
  )
  ON CONFLICT (id) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    categories  = EXCLUDED.categories,
    is_active   = EXCLUDED.is_active;
END $$;
