-- CCT 2026 Corrections — March 2026
-- 1. Add 2 new stops (King & Saint Cafe, Brew Crumberland's Best)
-- 2. Rename Xyda Coffee → IDEA Coffee (both locations), fix addresses + coordinates
-- 3. Fix Consciousness Coffee name, Denim Mech address, Macris Mech address,
--    Oxford Hall address, Lollipop Shop address, Mad Roast address
-- 4. Deactivate Breeches Bakery (dropped from current CVVB trail list)
-- 5. Update all holiday_specials descriptions to match

DO $$
DECLARE
  cumberland_market_id UUID := '0602afe2-fae2-4e46-af2c-7b374bfc9d45';
  basic_tier_id        UUID := '00000000-0000-0000-0000-000000000001';

  id_king_saint        UUID := 'cc2026cc-cafe-4000-8000-000000000008';
  id_brew_cumb         UUID := 'cc2026cc-cafe-4000-8000-000000000009';
BEGIN

  -- ─────────────────────────────────────────────────────────────
  -- 1. INSERT 2 new trail stops
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO restaurants (
    id, market_id, tier_id,
    name, slug,
    address, city, state, zip_code,
    latitude, longitude,
    categories,
    description,
    is_active, is_verified,
    checkin_pin
  ) VALUES
    (
      id_king_saint, cumberland_market_id, basic_tier_id,
      'King & Saint Cafe',
      'king-and-saint-cafe-shippensburg',
      '512 W King St', 'Shippensburg', 'PA', '17257',
      40.045253, -77.5307974,
      ARRAY['cafe_coffee', 'breakfast', 'brunch', 'lunch'],
      'King & Saint Cafe is a European-inspired specialty coffee and bakery in Shippensburg. Hand-crafted espresso drinks and fresh pastries — croissants, tarts, and biscotti — made by a classically trained chef using farm-fresh ingredients. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '1723'
    ),
    (
      id_brew_cumb, cumberland_market_id, basic_tier_id,
      'Brew Crumberland''s Best',
      'brew-crumberlands-best-new-cumberland',
      '1903 Bridge St', 'New Cumberland', 'PA', '17070',
      40.2398147, -76.8844865,
      ARRAY['cafe_coffee', 'breakfast', 'brunch'],
      'Brew Crumberland''s Best is a neighborhood coffee shop and drive-thru in New Cumberland serving specialty coffee, fine loose leaf tea, and house-made pastries baked by a trained pastry chef formerly of The Hotel Hershey. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '6491'
    )
  ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    categories  = EXCLUDED.categories,
    is_active   = EXCLUDED.is_active;

  -- ─────────────────────────────────────────────────────────────
  -- 2. Rename Xyda Coffee → IDEA Coffee + fix coordinates/addresses
  -- ─────────────────────────────────────────────────────────────

  UPDATE restaurants SET
    name        = 'IDEA Coffee',
    slug        = 'idea-coffee-arcona',
    address     = '1430 Markethouse Ln',
    city        = 'Mechanicsburg',
    zip_code    = '17050',
    latitude    = 40.1934137,
    longitude   = -76.9428581,
    description = 'IDEA Coffee is a neighborhood coffee shop in the Arcona community of Mechanicsburg, serving locally roasted beans from Lonely Monk Coffee, handcrafted espresso drinks, and fresh baked goods. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000006';

  UPDATE restaurants SET
    name        = 'IDEA Coffee',
    slug        = 'idea-coffee-walden',
    address     = '121 Walden Way',
    city        = 'Mechanicsburg',
    zip_code    = '17050',
    latitude    = 40.2368839,
    longitude   = -77.0202141,
    description = 'IDEA Coffee is a neighborhood coffee shop in the Walden community of Mechanicsburg, serving locally roasted beans from Lonely Monk Coffee, handcrafted espresso drinks, and fresh baked goods. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000007';

  -- ─────────────────────────────────────────────────────────────
  -- 3. Address + coordinate corrections for previously inserted stops
  -- ─────────────────────────────────────────────────────────────

  -- Oxford Hall: 333 → 233 Bridge St
  UPDATE restaurants SET
    address   = '233 Bridge St',
    latitude  = 40.2266667,
    longitude = -76.8638889
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000005';

  -- Macris Chocolates Mechanicsburg: 5903 → 6395 Carlisle Pike
  UPDATE restaurants SET
    address   = '6395 Carlisle Pike',
    latitude  = 40.247393,
    longitude = -77.004317
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000004';

  -- Lollipop Shop: 111 → 112 E King St
  UPDATE restaurants SET
    address   = '112 E King St',
    latitude  = 40.0514004,
    longitude = -77.5180723
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000003';

  -- Denim Coffee Mechanicsburg: 34 → 36 W Main St
  UPDATE restaurants SET
    address   = '36 W Main St',
    latitude  = 40.2130601,
    longitude = -77.0091497
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000002';

  -- ─────────────────────────────────────────────────────────────
  -- 4. Fix existing (pre-migration) restaurant records
  -- ─────────────────────────────────────────────────────────────

  -- Consciousness Coffee: name + address + coordinates
  UPDATE restaurants SET
    name      = 'Consciousness Coffee',
    slug      = 'consciousness-coffee-lemoyne',
    address   = '1 Lemoyne Square Suite 108',
    city      = 'Lemoyne',
    latitude  = 40.2506,
    longitude = -76.9140
  WHERE id = 'a40f3b29-0d3a-4e8b-a6ae-2349606d21c4';

  -- Mad Roast: fix address + coordinates (name already updated in migration 2)
  UPDATE restaurants SET
    address   = '333 B St',
    city      = 'Carlisle',
    zip_code  = '17013',
    latitude  = 40.2099108,
    longitude = -77.1959924
  WHERE id = '433d16bf-5b6d-4962-aa6f-894b121d127d';

  -- ─────────────────────────────────────────────────────────────
  -- 5. Add holiday_specials for the 2 new stops
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO holiday_specials (restaurant_id, holiday_tag, is_active, name, description, event_date)
  VALUES
    (id_king_saint, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'King & Saint Cafe is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. A European-inspired bakery and specialty coffee shop in Shippensburg with hand-crafted espresso drinks, croissants, tarts, and biscotti.',
     '2026-05-11'),
    (id_brew_cumb, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Brew Crumberland''s Best is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. A neighborhood coffee shop and drive-thru in New Cumberland with specialty coffee, fine loose leaf tea, and house-made pastries.',
     '2026-05-11')
  ON CONFLICT DO NOTHING;

  -- ─────────────────────────────────────────────────────────────
  -- 6. Update holiday_specials descriptions for renamed/corrected stops
  -- ─────────────────────────────────────────────────────────────

  -- IDEA Coffee Arcona (was Xyda)
  UPDATE holiday_specials SET
    description = 'IDEA Coffee (Arcona) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Locally roasted coffee and handcrafted espresso drinks in the Arcona community of Mechanicsburg.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000006'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

  -- IDEA Coffee Walden (was Xyda)
  UPDATE holiday_specials SET
    description = 'IDEA Coffee (Walden) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Locally roasted coffee and handcrafted espresso drinks in the Walden community of Mechanicsburg.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000007'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

  -- Consciousness Coffee (was Conscious Coffee)
  UPDATE holiday_specials SET
    description = 'Consciousness Coffee is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Locally sourced, thoughtfully roasted specialty coffee in Lemoyne Square.'
  WHERE restaurant_id = 'a40f3b29-0d3a-4e8b-a6ae-2349606d21c4'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

  -- Mad Roast (update description to drop old Crazy Glazed copy)
  UPDATE holiday_specials SET
    description = 'Mad Roast is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee at 333 B Street in Carlisle — formerly known as Crazy Glazed, which lives on as their food truck.'
  WHERE restaurant_id = '433d16bf-5b6d-4962-aa6f-894b121d127d'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

  -- ─────────────────────────────────────────────────────────────
  -- 7. Deactivate Breeches Bakery — removed from current CVVB trail list
  -- ─────────────────────────────────────────────────────────────

  UPDATE holiday_specials SET is_active = false
  WHERE restaurant_id = '1bd17f58-2d8e-4187-af4d-dee1cfd092b3'
    AND holiday_tag = 'coffee-chocolate-trail-2026';

END $$;
