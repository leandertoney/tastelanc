-- Coffee & Chocolate Trail 2026 — Cumberland Valley
-- Trail runs: January 28 – May 11, 2026
-- 26 official stops; 19 already in restaurants table, 7 added below.

DO $$
DECLARE
  cumberland_market_id UUID  := '0602afe2-fae2-4e46-af2c-7b374bfc9d45';
  basic_tier_id        UUID  := '00000000-0000-0000-0000-000000000001';

  -- Stable UUIDs for the 7 new restaurants (deterministic so re-runs are idempotent)
  id_cracked_pot_mech  UUID  := 'cc2026cc-cafe-4000-8000-000000000001';
  id_denim_mech        UUID  := 'cc2026cc-cafe-4000-8000-000000000002';
  id_lollipop          UUID  := 'cc2026cc-cafe-4000-8000-000000000003';
  id_macris_mech       UUID  := 'cc2026cc-cafe-4000-8000-000000000004';
  id_oxford_hall       UUID  := 'cc2026cc-cafe-4000-8000-000000000005';
  id_xyda_arcona       UUID  := 'cc2026cc-cafe-4000-8000-000000000006';
  id_xyda_walden       UUID  := 'cc2026cc-cafe-4000-8000-000000000007';
BEGIN

  -- ─────────────────────────────────────────────────────────────
  -- 1. INSERT the 7 missing restaurants with full data
  --    All fields populated so they look great in the app.
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
      id_cracked_pot_mech, cumberland_market_id, basic_tier_id,
      'The Cracked Pot Coffee Shop',
      'the-cracked-pot-coffee-shop-mechanicsburg',
      '130 Gettysburg Pike', 'Mechanicsburg', 'PA', '17055',
      40.2138, -77.0218,
      ARRAY['cafe_coffee', 'breakfast', 'brunch', 'lunch'],
      'The Cracked Pot Coffee Shop in Mechanicsburg offers specialty coffee drinks, espresso, and light bites in a welcoming café atmosphere. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '4721'
    ),
    (
      id_denim_mech, cumberland_market_id, basic_tier_id,
      'Denim Coffee',
      'denim-coffee-mechanicsburg',
      '34 W Main St', 'Mechanicsburg', 'PA', '17055',
      40.2141, -77.0073,
      ARRAY['cafe_coffee', 'breakfast', 'brunch'],
      'Denim Coffee in Mechanicsburg brings craft coffee and a laid-back vibe to downtown. Expect carefully sourced beans and expertly prepared espresso drinks. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '3852'
    ),
    (
      id_lollipop, cumberland_market_id, basic_tier_id,
      'Lollipop Shop',
      'lollipop-shop-shippensburg',
      '111 E King St', 'Shippensburg', 'PA', '17257',
      40.0507, -77.5185,
      ARRAY['desserts', 'casual'],
      'The Lollipop Shop in Shippensburg is a sweet destination stocking candy, chocolates, and novelty treats. A beloved stop for anyone with a sweet tooth in the Cumberland Valley. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '5963'
    ),
    (
      id_macris_mech, cumberland_market_id, basic_tier_id,
      'Macris Chocolates',
      'macris-chocolates-mechanicsburg',
      '5903 Carlisle Pike', 'Mechanicsburg', 'PA', '17050',
      40.2183, -77.0554,
      ARRAY['desserts', 'casual'],
      'Macris Chocolates on Carlisle Pike in Mechanicsburg handcrafts Belgian-style truffles, bark, and seasonal confections. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '8147'
    ),
    (
      id_oxford_hall, cumberland_market_id, basic_tier_id,
      'Oxford Hall Celtic Shop',
      'oxford-hall-celtic-shop-new-cumberland',
      '333 Bridge St', 'New Cumberland', 'PA', '17070',
      40.2337, -76.8756,
      ARRAY['casual'],
      'Oxford Hall Celtic Shop in New Cumberland is a charming destination for Celtic gifts, specialty teas, and imported chocolates. A unique stop blending culture and sweet treats. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '2049'
    ),
    (
      id_xyda_arcona, cumberland_market_id, basic_tier_id,
      'Xyda Coffee',
      'xyda-coffee-arcona',
      '143 Market House Ln', 'Mechanicsburg', 'PA', '17050',
      40.1997, -76.9961,
      ARRAY['cafe_coffee', 'breakfast', 'brunch'],
      'Xyda Coffee in the Arcona community of Mechanicsburg serves specialty coffee drinks in a bright, modern café space. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '6318'
    ),
    (
      id_xyda_walden, cumberland_market_id, basic_tier_id,
      'Xyda Coffee',
      'xyda-coffee-walden',
      '121 Walden Way', 'Mechanicsburg', 'PA', '17050',
      40.2156, -76.9982,
      ARRAY['cafe_coffee', 'breakfast', 'brunch'],
      'Xyda Coffee in the Walden community of Mechanicsburg offers a welcoming neighborhood café with specialty coffee and espresso drinks. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.',
      true, false,
      '7435'
    )
  ON CONFLICT (id) DO UPDATE SET
    description = EXCLUDED.description,
    categories  = EXCLUDED.categories,
    is_active   = EXCLUDED.is_active;

  -- ─────────────────────────────────────────────────────────────
  -- 2. INSERT holiday_specials for all 26 trail stops
  -- ─────────────────────────────────────────────────────────────

  INSERT INTO holiday_specials (restaurant_id, holiday_tag, is_active, name, description, event_date)
  VALUES
    -- 19 existing restaurants
    ('1bd17f58-2d8e-4187-af4d-dee1cfd092b3', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Breeches Bakery & Café at Allenberry Resort is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Find specialty coffee and fresh-baked treats in a stunning resort setting in Boiling Springs.',
     '2026-05-11'),
    ('c2b58e3f-9696-4610-b763-f1f79197acd6', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Candy Mountain Creamery is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Indulge in handcrafted ice cream flavors and sweet treats in Dillsburg.',
     '2026-05-11'),
    ('a40f3b29-0d3a-4e8b-a6ae-2349606d21c4', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Conscious Coffee is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Locally sourced, thoughtfully roasted coffee in a welcoming space in Lemoyne.',
     '2026-05-11'),
    ('dbc6a412-2f8c-459e-8785-30aa98b283c3', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Cornerstone Coffeehouse is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. A beloved neighborhood café serving specialty coffee and espresso drinks in Camp Hill.',
     '2026-05-11'),
    ('1cd6d8c5-721e-45ee-9423-cd12602d6773', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'The Cracked Pot Coffee Shop (Carlisle) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee and light bites in the heart of downtown Carlisle.',
     '2026-05-11'),
    ('433d16bf-5b6d-4962-aa6f-894b121d127d', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Crazy Glazed is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Creative gourmet glazed donuts paired with great coffee in Carlisle.',
     '2026-05-11'),
    ('be062d9a-c799-4fe1-a52a-1c0aabf2ec2a', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Dalicia Ristorante & Bakery is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Authentic Italian pastries, espresso drinks, and artisan baked goods in Mechanicsburg.',
     '2026-05-11'),
    ('7540c94e-8030-40c7-96c4-3afaa4e343a2', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Deibler Family Adventures is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Unique freeze-dried candy and novelty treats — a one-of-a-kind sweet stop in Mount Holly Springs.',
     '2026-05-11'),
    ('247153c8-9dbd-49ad-a3d4-8ba2674b5033', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Denim Coffee (Carlisle) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Craft coffee with a relaxed, approachable atmosphere in downtown Carlisle.',
     '2026-05-11'),
    ('6d6f8b23-0bc4-46c3-86b4-1ba7dfff816a', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Down to Earth Café is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Fresh, wholesome café fare and specialty coffee in Mechanicsburg.',
     '2026-05-11'),
    ('ac9783de-eea1-4526-92d3-e4f3f1182a53', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Exquisite Chocolates of Carlisle is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Handcrafted artisan chocolates and confections in the heart of Carlisle.',
     '2026-05-11'),
    ('28253db1-fd7e-4451-913d-d46b5ea10894', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Good Ground Coffee Company is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Single-origin, expertly roasted and brewed coffee in Camp Hill.',
     '2026-05-11'),
    ('1ccaa7d1-3c18-4733-a574-925274c74c7f', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Helena''s Chocolate Café & Crêperie is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Belgian-style hot chocolate, decadent chocolate drinks, and savory crêpes in Carlisle.',
     '2026-05-11'),
    ('478262d0-6786-46ef-9603-df8e20c60858', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Jane''s Art of Pie Café is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Homemade pies, pastries, and specialty coffee in Shippensburg.',
     '2026-05-11'),
    ('d7cb1001-ffd7-43ee-adf7-4204de0c5e3e', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Juice & Java Café is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Fresh cold-pressed juices and specialty coffee drinks in Mechanicsburg.',
     '2026-05-11'),
    ('27b2854b-e3b5-40f0-a1ba-f544f44b1670', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Macris Chocolates (Lemoyne) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Belgian chocolate truffles, bark, and handcrafted confections in Lemoyne.',
     '2026-05-11'),
    ('f0da1a8c-6ebc-44aa-a443-0c4be3167654', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Mummert Chocolates is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Small-batch artisan chocolates made with care in historic Carlisle.',
     '2026-05-11'),
    ('7253dac5-8a5a-4ab4-8406-801b97897e26', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Nour is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. A Middle Eastern–inspired café serving specialty coffee, mezze, and sweet treats in Camp Hill.',
     '2026-05-11'),
    ('25dde809-10ac-41aa-bbcd-b042acf926dd', 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'The Pennsylvania Bakery is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. European-style artisan breads, pastries, and coffee drinks in Camp Hill.',
     '2026-05-11'),
    -- 7 newly inserted restaurants
    (id_cracked_pot_mech, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'The Cracked Pot Coffee Shop (Mechanicsburg) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee and light bites on Gettysburg Pike.',
     '2026-05-11'),
    (id_denim_mech, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Denim Coffee (Mechanicsburg) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Craft coffee with a relaxed atmosphere in downtown Mechanicsburg.',
     '2026-05-11'),
    (id_lollipop, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'The Lollipop Shop is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. A delightful candy and chocolate destination in Shippensburg.',
     '2026-05-11'),
    (id_macris_mech, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Macris Chocolates (Mechanicsburg) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Belgian-style truffles and confections on Carlisle Pike.',
     '2026-05-11'),
    (id_oxford_hall, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Oxford Hall Celtic Shop is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Celtic gifts, specialty teas, and imported chocolates in New Cumberland.',
     '2026-05-11'),
    (id_xyda_arcona, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Xyda Coffee (Arcona) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee in a bright, welcoming café in the Arcona community.',
     '2026-05-11'),
    (id_xyda_walden, 'coffee-chocolate-trail-2026', true,
     'Coffee & Chocolate Trail Stop',
     'Xyda Coffee (Walden) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee in a neighborhood café in the Walden community.',
     '2026-05-11')
  ON CONFLICT DO NOTHING;

END $$;
