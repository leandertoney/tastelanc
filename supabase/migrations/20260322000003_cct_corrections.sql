-- CCT 2026 corrections — synced against live CVVB list (March 2026)
-- Changes:
--   1. Add 2 new trail stops: King & Saint Cafe, Brew Cumberland's Best
--   2. Rename Xyda Coffee → IDEA Coffee (Arcona + Walden)
--   3. Rename Conscious Coffee → Consciousness Coffee
--   4. Update Helena's name (drop "Chocolate")
--   5. Fix Oxford Hall address (333 → 233 Bridge St)
--   6. Fix Mad Roast address (333 B Street)
--   7. Deactivate Breeches Bakery trail stop (dropped from CVVB list)

DO $$
DECLARE
  cumberland_market_id UUID := '0602afe2-fae2-4e46-af2c-7b374bfc9d45';
  basic_tier_id        UUID := '00000000-0000-0000-0000-000000000001';

  id_king_saint   UUID := 'cc2026cc-cafe-4000-8000-000000000008';
  id_brew_cumb    UUID := 'cc2026cc-cafe-4000-8000-000000000009';

  -- Previously inserted UUIDs
  id_xyda_arcona  UUID := 'cc2026cc-cafe-4000-8000-000000000006';
  id_xyda_walden  UUID := 'cc2026cc-cafe-4000-8000-000000000007';
  id_oxford_hall  UUID := 'cc2026cc-cafe-4000-8000-000000000005';
BEGIN

  -- ─── 1. New restaurants ───────────────────────────────────────────────────

  INSERT INTO restaurants (
    id, market_id, tier_id,
    name, slug,
    address, city, state, zip_code,
    latitude, longitude,
    categories, description,
    is_active, is_verified, checkin_pin
  ) VALUES
    (
      id_king_saint, cumberland_market_id, basic_tier_id,
      'King & Saint Cafe',
      'king-and-saint-cafe-shippensburg',
      '512 W. King St.', 'Shippensburg', 'PA', '17257',
      40.0490, -77.5210,
      ARRAY['cafe_coffee', 'breakfast', 'brunch', 'lunch'],
      'King & Saint Cafe is a welcoming coffeehouse in Shippensburg offering specialty coffee drinks, espresso, and café fare. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false, '3174'
    ),
    (
      id_brew_cumb, cumberland_market_id, basic_tier_id,
      'Brew Cumberland''s Best',
      'brew-cumberlands-best-new-cumberland',
      '1903 Bridge Street', 'New Cumberland', 'PA', '17070',
      40.2275, -76.8820,
      ARRAY['cafe_coffee', 'breakfast', 'brunch'],
      'Brew Cumberland''s Best is a neighborhood café in New Cumberland serving locally inspired coffee drinks and light bites. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false, '6092'
    )
  ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    categories  = EXCLUDED.categories,
    is_active   = EXCLUDED.is_active;

  -- ─── 2. Add holiday_specials for the 2 new stops ──────────────────────────

  INSERT INTO holiday_specials (restaurant_id, holiday_tag, is_active, name, description, event_date)
  VALUES
    (id_king_saint, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'King & Saint Cafe is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee and café fare in Shippensburg, PA.',
     '2026-05-11'),
    (id_brew_cumb, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Brew Cumberland''s Best is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. A neighborhood café in New Cumberland, PA.',
     '2026-05-11')
  ON CONFLICT DO NOTHING;

  -- ─── 3. Rename Xyda Coffee → IDEA Coffee ─────────────────────────────────

  UPDATE restaurants
  SET name = 'IDEA Coffee Arcona',
      slug = 'idea-coffee-arcona',
      address = '1430 Markethouse Ln.',
      description = 'IDEA Coffee in the Arcona community of Mechanicsburg serves specialty coffee drinks in a bright, modern café space. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.'
  WHERE id = id_xyda_arcona;

  UPDATE restaurants
  SET name = 'IDEA Coffee Walden',
      slug = 'idea-coffee-walden',
      description = 'IDEA Coffee in the Walden community of Mechanicsburg offers a welcoming neighborhood café with specialty coffee and espresso drinks. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.'
  WHERE id = id_xyda_walden;

  UPDATE holiday_specials
  SET description = 'IDEA Coffee (Arcona) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee in a bright, welcoming café in the Arcona community of Mechanicsburg.'
  WHERE restaurant_id = id_xyda_arcona AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials
  SET description = 'IDEA Coffee (Walden) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee in a neighborhood café in the Walden community of Mechanicsburg.'
  WHERE restaurant_id = id_xyda_walden AND holiday_tag = 'coffee-chocolate-trail-2026';

  -- ─── 4. Conscious Coffee → Consciousness Coffee ───────────────────────────

  UPDATE restaurants
  SET name = 'Consciousness Coffee',
      slug = 'consciousness-coffee-lemoyne'
  WHERE id = 'a40f3b29-0d3a-4e8b-a6ae-2349606d21c4';

  UPDATE holiday_specials
  SET description = 'Consciousness Coffee is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Locally sourced, thoughtfully roasted coffee in Lemoyne, PA.'
  WHERE restaurant_id = 'a40f3b29-0d3a-4e8b-a6ae-2349606d21c4'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

  -- ─── 5. Helena's — drop "Chocolate" from name ────────────────────────────

  UPDATE restaurants
  SET name = 'Helena''s Cafe & Creperie',
      slug = 'helenas-cafe-and-creperie-carlisle'
  WHERE id = '1ccaa7d1-3c18-4733-a574-925274c74c7f';

  UPDATE holiday_specials
  SET description = 'Helena''s Cafe & Creperie is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee, crêpes, and sweet treats in Carlisle, PA.'
  WHERE restaurant_id = '1ccaa7d1-3c18-4733-a574-925274c74c7f'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

  -- ─── 6. Fix Oxford Hall address (333 → 233 Bridge St) ────────────────────

  UPDATE restaurants
  SET address = '233 Bridge Street'
  WHERE id = id_oxford_hall;

  -- ─── 7. Fix Mad Roast address ─────────────────────────────────────────────

  UPDATE restaurants
  SET address = '333 B Street'
  WHERE id = '433d16bf-5b6d-4962-aa6f-894b121d127d';

  -- ─── 8. Deactivate Breeches Bakery trail stop (dropped from CVVB list) ───

  UPDATE holiday_specials
  SET is_active = false
  WHERE restaurant_id = '1bd17f58-2d8e-4187-af4d-dee1cfd092b3'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

END $$;
