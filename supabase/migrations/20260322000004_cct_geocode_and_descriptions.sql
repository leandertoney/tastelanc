-- CCT 2026: Update all 27 stops with verified Google Places coordinates,
-- correct addresses, and rich descriptions for restaurant records + trail cards.

DO $$
BEGIN

  -- ─────────────────────────────────────────────────────────────────────────
  -- RESTAURANT RECORDS (lat/lng + address + description)
  -- ─────────────────────────────────────────────────────────────────────────

  -- 1. Good Ground Coffee Company
  UPDATE restaurants SET
    latitude = 40.2371539, longitude = -76.9100274,
    address = '244 S 17th St',
    description = 'A community-focused specialty coffee shop in Camp Hill offering carefully sourced brews and espresso drinks in a welcoming neighborhood setting.'
  WHERE id = '28253db1-fd7e-4451-913d-d46b5ea10894';

  -- 2. Helena's Cafe & Creperie
  UPDATE restaurants SET
    latitude = 40.2014458, longitude = -77.1907884,
    address = '36 W High St',
    description = 'A charming cafe in downtown Carlisle serving handcrafted sweet and savory crepes alongside specialty coffee drinks and house-made chocolates.'
  WHERE id = '1ccaa7d1-3c18-4733-a574-925274c74c7f';

  -- 3. IDEA Coffee Arcona
  UPDATE restaurants SET
    latitude = 40.1934137, longitude = -76.9428581,
    address = '1430 Markethouse Ln',
    description = 'A modern coffeehouse nestled in the Arcona neighborhood of Mechanicsburg, serving specialty espresso drinks and light fare in a vibrant community gathering space.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000006';

  -- 4. IDEA Coffee Walden
  UPDATE restaurants SET
    latitude = 40.2368839, longitude = -77.0202141,
    address = '121 Walden Way',
    description = 'The Walden location of IDEA Coffee, bringing specialty coffee and a welcoming community coffeehouse atmosphere to the Walden development in Mechanicsburg.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000007';

  -- 5. Jane's Art of Pie Cafe
  UPDATE restaurants SET
    latitude = 40.0501571, longitude = -77.5211524,
    address = '20 W King St',
    description = 'A beloved Shippensburg cafe celebrated for scratch-made pies, pastries, and espresso drinks served in a warm, artfully decorated space on the main street.'
  WHERE id = '478262d0-6786-46ef-9603-df8e20c60858';

  -- 6. Juice & Java Cafe
  UPDATE restaurants SET
    latitude = 40.2172222, longitude = -76.9816667,
    address = '5258 Simpson Ferry Rd',
    description = 'Lively, low-key coffee shop providing espresso, light fare, and fresh fruit smoothies in Mechanicsburg.'
  WHERE id = 'd7cb1001-ffd7-43ee-adf7-4204de0c5e3e';

  -- 7. King & Saint Cafe
  UPDATE restaurants SET
    latitude = 40.045253, longitude = -77.5307974,
    address = '512 W King St',
    city = 'Shippensburg', state = 'PA', zip_code = '17257',
    description = 'A cozy neighborhood cafe in Shippensburg offering specialty coffee, teas, and light bites in a relaxed, community-centered atmosphere.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000008';

  -- 8. Lollipop Shop
  UPDATE restaurants SET
    latitude = 40.0514004, longitude = -77.5180723,
    address = '112 E King St',
    description = 'A delightful candy and sweet shop on Shippensburg''s main street, offering nostalgic confections, chocolates, and treats for all ages.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000003';

  -- 9. Macris Chocolates Mechanicsburg
  UPDATE restaurants SET
    latitude = 40.247393, longitude = -77.004317,
    address = '6395 Carlisle Pike',
    description = 'A family-owned artisan chocolatier crafting premium handmade chocolates, truffles, and confections with time-honored recipes at their Mechanicsburg location.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000004';

  -- 10. Macris Chocolates Lemoyne
  UPDATE restaurants SET
    latitude = 40.2396815, longitude = -76.9070834,
    address = '1200 Market St',
    description = 'The Lemoyne outpost of Macris Chocolates, offering expertly crafted handmade truffles, bark, and seasonal confections on Market Street.'
  WHERE id = '27b2854b-e3b5-40f0-a1ba-f544f44b1670';

  -- 11. Mummert Chocolates
  UPDATE restaurants SET
    latitude = 40.2000722, longitude = -77.1899152,
    address = '21 W Pomfret St',
    description = 'A small-batch artisan chocolate shop in the heart of Carlisle, handcrafting premium truffles, bark, and seasonal chocolates from carefully selected ingredients.'
  WHERE id = 'f0da1a8c-6ebc-44aa-a443-0c4be3167654';

  -- 12. Nour
  UPDATE restaurants SET
    latitude = 40.2386696, longitude = -76.9616487,
    address = '101 Saint Johns Church Rd',
    description = 'A bright, modern specialty coffee bar in Camp Hill serving meticulously prepared espresso and pour-over coffees in an inviting, light-filled space.'
  WHERE id = '7253dac5-8a5a-4ab4-8406-801b97897e26';

  -- 13. Brew Cumberland's Best
  UPDATE restaurants SET
    latitude = 40.2398147, longitude = -76.8844865,
    address = '1903 Bridge St',
    city = 'New Cumberland', state = 'PA', zip_code = '17070',
    description = 'Relaxed coffeehouse in New Cumberland with locally roasted java, cafe fare, and housemade pastries, plus a convenient drive-thru.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000009';

  -- 14. Candy Mountain Creamery
  UPDATE restaurants SET
    latitude = 40.112983, longitude = -77.040138,
    address = '11 N US-15',
    description = 'A whimsical creamery in Dillsburg scooping homemade ice cream alongside chocolates, candies, and sweet treats that delight visitors of all ages.'
  WHERE id = 'c2b58e3f-9696-4610-b763-f1f79197acd6';

  -- 15. Consciousness Coffee
  UPDATE restaurants SET
    latitude = 40.2505705, longitude = -76.913977,
    address = '1 Lemoyne Square',
    description = 'A thoughtfully curated specialty coffee shop in Lemoyne Square focused on mindful sourcing, expertly crafted espresso drinks, and a calm, intentional cafe environment.'
  WHERE id = 'a40f3b29-0d3a-4e8b-a6ae-2349606d21c4';

  -- 16. Cornerstone Coffeehouse
  UPDATE restaurants SET
    latitude = 40.239809, longitude = -76.921143,
    address = '2133 Market St',
    description = 'A comfy, eclectic coffeehouse in Camp Hill featuring specialty espresso, daytime cafe meals, and live music nights in a funky, welcoming atmosphere.'
  WHERE id = 'dbc6a412-2f8c-459e-8785-30aa98b283c3';

  -- 17. The Cracked Pot Coffee Shop Carlisle
  UPDATE restaurants SET
    latitude = 40.2028315, longitude = -77.189132,
    address = '36 N Hanover St',
    description = 'A cozy, eclectic coffee shop on Carlisle''s main corridor serving handcrafted espresso drinks, loose-leaf teas, and homemade baked goods in a welcoming, quirky atmosphere.'
  WHERE id = '1cd6d8c5-721e-45ee-9423-cd12602d6773';

  -- 18. The Cracked Pot Coffee Shop Mechanicsburg
  UPDATE restaurants SET
    latitude = 40.1828011, longitude = -76.9876469,
    address = '130 Gettysburg Pike',
    description = 'The Mechanicsburg location of The Cracked Pot, bringing the same beloved handcrafted coffee drinks and homemade baked goods to the Gettysburg Pike corridor.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000001';

  -- 19. Dalicia Ristorante & Bakery
  UPDATE restaurants SET
    latitude = 40.212217, longitude = -77.0072789,
    address = '105 S Market St',
    description = 'An Italian-inspired ristorante and bakery in downtown Mechanicsburg combining freshly baked breads and pastries with espresso drinks and savory cafe fare.'
  WHERE id = 'be062d9a-c799-4fe1-a52a-1c0aabf2ec2a';

  -- 20. Deibler Family Adventures Freeze Dried Treats
  UPDATE restaurants SET
    latitude = 40.1186972, longitude = -77.1900999,
    address = '305 N Baltimore Ave',
    city = 'Mount Holly Springs', state = 'PA', zip_code = '17065',
    description = 'A unique family-run shop in Mount Holly Springs specializing in freeze-dried candy and novelty treats — a fun, one-of-a-kind stop on the trail.'
  WHERE id = '7540c94e-8030-40c7-96c4-3afaa4e343a2';

  -- 21. Denim Coffee Carlisle
  UPDATE restaurants SET
    latitude = 40.2007688, longitude = -77.1889979,
    address = '1 S Hanover St',
    description = 'A sleek specialty coffee brand rooted in Cumberland Valley, serving carefully sourced single-origin coffees and espresso drinks at their flagship Carlisle location.'
  WHERE id = '247153c8-9dbd-49ad-a3d4-8ba2674b5033';

  -- 22. Denim Coffee Mechanicsburg
  UPDATE restaurants SET
    latitude = 40.2130601, longitude = -77.0091497,
    address = '36 W Main St',
    description = 'Denim Coffee''s Mechanicsburg location on West Main Street, offering specialty roasts and expertly crafted espresso in the heart of downtown Mechanicsburg.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000002';

  -- 23. Down to Earth Cafe
  UPDATE restaurants SET
    latitude = 40.2015163, longitude = -76.9976136,
    address = '100 Legacy Park Dr',
    description = 'A health-conscious cafe in Mechanicsburg''s Legacy Park offering wholesome meals, fresh juices, smoothies, and specialty coffee in a bright, welcoming space.'
  WHERE id = '6d6f8b23-0bc4-46c3-86b4-1ba7dfff816a';

  -- 24. Exquisite Chocolates of Carlisle
  UPDATE restaurants SET
    latitude = 40.2001128, longitude = -77.1891562,
    address = '35 S Hanover St',
    description = 'A boutique chocolate shop on Carlisle''s South Hanover Street handcrafting truffles, dipped fruits, and seasonal confections from premium Belgian and domestic chocolate.'
  WHERE id = 'ac9783de-eea1-4526-92d3-e4f3f1182a53';

  -- 25. Oxford Hall Celtic Shop
  UPDATE restaurants SET
    latitude = 40.2266667, longitude = -76.8638889,
    address = '233 Bridge St',
    description = 'A charming Celtic-themed shop in New Cumberland offering Irish and Scottish gifts, imported goods, specialty teas, and chocolate — a unique stop blending culture and sweet treats.'
  WHERE id = 'cc2026cc-cafe-4000-8000-000000000005';

  -- 26. Pennsylvania Bakery
  UPDATE restaurants SET
    latitude = 40.2398356, longitude = -76.9136091,
    address = '1713 Market St',
    description = 'A relaxed, family-run bakery in Camp Hill offering a range of cakes, pies, breads, and pastries alongside coffee drinks in a friendly neighborhood setting.'
  WHERE id = '25dde809-10ac-41aa-bbcd-b042acf926dd';

  -- 27. Mad Roast
  UPDATE restaurants SET
    latitude = 40.2099108, longitude = -77.1959924,
    address = '333 B St',
    description = 'A craft coffee roastery and cafe in Carlisle roasting small batches in-house and serving precision-brewed espresso and filter coffee. Formerly known as Crazy Glazed — the coffee shop rebranded while Crazy Glazed lives on as their food truck.'
  WHERE id = '433d16bf-5b6d-4962-aa6f-894b121d127d';

  -- ─────────────────────────────────────────────────────────────────────────
  -- HOLIDAY_SPECIALS (trail card back descriptions)
  -- ─────────────────────────────────────────────────────────────────────────

  UPDATE holiday_specials SET description =
    'Good Ground Coffee Company is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This community-focused specialty coffee shop in Camp Hill pours carefully sourced brews and espresso drinks in a welcoming neighborhood setting. Stop in, pick up your passport stamp, and stay a while.'
  WHERE restaurant_id = '28253db1-fd7e-4451-913d-d46b5ea10894' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Helena''s Cafe & Creperie is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This charming downtown Carlisle cafe is known for handcrafted sweet and savory crepes, specialty coffee drinks, and house-made chocolates — a must-visit for any trail explorer.'
  WHERE restaurant_id = '1ccaa7d1-3c18-4733-a574-925274c74c7f' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'IDEA Coffee Arcona is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Tucked into Mechanicsburg''s Arcona neighborhood, this modern coffeehouse serves specialty espresso drinks and light fare in a vibrant community gathering space.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000006' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'IDEA Coffee Walden is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Located in Mechanicsburg''s Walden community, IDEA Coffee brings the same specialty coffee experience and welcoming coffeehouse atmosphere to a neighborhood setting.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000007' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Jane''s Art of Pie Cafe is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This beloved Shippensburg cafe is celebrated for scratch-made pies, pastries, and espresso drinks served in a warm, artfully decorated space on the main street.'
  WHERE restaurant_id = '478262d0-6786-46ef-9603-df8e20c60858' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Juice & Java Cafe is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This lively Mechanicsburg spot offers espresso, light cafe fare, and fresh fruit smoothies in a laid-back, welcoming atmosphere.'
  WHERE restaurant_id = 'd7cb1001-ffd7-43ee-adf7-4204de0c5e3e' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'King & Saint Cafe is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This cozy Shippensburg neighborhood cafe serves specialty coffee, teas, and light bites in a relaxed, community-centered atmosphere.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000008' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Lollipop Shop is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Located on Shippensburg''s main street, this delightful candy shop offers nostalgic confections, chocolates, and sweet treats for visitors of all ages.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000003' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Macris Chocolates Mechanicsburg is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This family-owned artisan chocolatier crafts premium handmade chocolates, truffles, and confections using time-honored recipes at their Carlisle Pike location.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000004' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Macris Chocolates Lemoyne is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. The Lemoyne outpost of this family-owned chocolatier offers the same expertly crafted handmade truffles, bark, and seasonal confections on Market Street.'
  WHERE restaurant_id = '27b2854b-e3b5-40f0-a1ba-f544f44b1670' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Mummert Chocolates is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This small-batch artisan chocolate shop in the heart of Carlisle handcrafts premium truffles, bark, and seasonal chocolates from carefully selected ingredients.'
  WHERE restaurant_id = 'f0da1a8c-6ebc-44aa-a443-0c4be3167654' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Nour is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This bright, modern specialty coffee bar in Camp Hill serves meticulously prepared espresso and pour-over coffees in an inviting, light-filled space.'
  WHERE restaurant_id = '7253dac5-8a5a-4ab4-8406-801b97897e26' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Brew Cumberland''s Best is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This relaxed New Cumberland coffeehouse serves locally roasted java, cafe fare, and housemade pastries — with a convenient drive-thru for trail-goers on the move.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000009' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Candy Mountain Creamery is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This whimsical Dillsburg creamery scoops homemade ice cream alongside chocolates, candies, and sweet treats that delight visitors of all ages.'
  WHERE restaurant_id = 'c2b58e3f-9696-4610-b763-f1f79197acd6' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Consciousness Coffee is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Located in Lemoyne Square, this thoughtfully curated specialty coffee shop focuses on mindful sourcing, expertly crafted espresso drinks, and a calm, intentional cafe environment.'
  WHERE restaurant_id = 'a40f3b29-0d3a-4e8b-a6ae-2349606d21c4' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Cornerstone Coffeehouse is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This comfy, eclectic Camp Hill coffeehouse features specialty espresso, daytime cafe meals, and live music nights in a funky, welcoming atmosphere.'
  WHERE restaurant_id = 'dbc6a412-2f8c-459e-8785-30aa98b283c3' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'The Cracked Pot Coffee Shop (Carlisle) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This cozy, eclectic spot on Carlisle''s North Hanover Street serves handcrafted espresso drinks, loose-leaf teas, and homemade baked goods in a welcoming, quirky atmosphere.'
  WHERE restaurant_id = '1cd6d8c5-721e-45ee-9423-cd12602d6773' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'The Cracked Pot Coffee Shop (Mechanicsburg) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Located on Gettysburg Pike, this Mechanicsburg location brings the same beloved handcrafted coffee drinks and homemade baked goods as the Carlisle original.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000001' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Dalicia Ristorante & Bakery is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This Italian-inspired bakery and cafe in downtown Mechanicsburg combines freshly baked breads and pastries with espresso drinks and savory cafe fare.'
  WHERE restaurant_id = 'be062d9a-c799-4fe1-a52a-1c0aabf2ec2a' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Deibler Family Adventures is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This unique family-run shop in Mount Holly Springs specializes in freeze-dried candy and novelty treats — a one-of-a-kind sweet stop unlike anything else on the trail.'
  WHERE restaurant_id = '7540c94e-8030-40c7-96c4-3afaa4e343a2' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Denim Coffee (Carlisle) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This sleek Cumberland Valley specialty coffee brand serves carefully sourced single-origin coffees and expertly crafted espresso drinks at their flagship South Hanover Street location.'
  WHERE restaurant_id = '247153c8-9dbd-49ad-a3d4-8ba2674b5033' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Denim Coffee (Mechanicsburg) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Located on West Main Street in the heart of downtown Mechanicsburg, this location brings Denim Coffee''s specialty roasts and expertly crafted espresso to a second Cumberland Valley address.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000002' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Down to Earth Cafe is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This health-conscious cafe in Mechanicsburg''s Legacy Park offers wholesome meals, fresh juices, smoothies, and specialty coffee in a bright, welcoming space.'
  WHERE restaurant_id = '6d6f8b23-0bc4-46c3-86b4-1ba7dfff816a' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Exquisite Chocolates of Carlisle is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This boutique chocolate shop on South Hanover Street handcrafts truffles, dipped fruits, and seasonal confections from premium Belgian and domestic chocolate.'
  WHERE restaurant_id = 'ac9783de-eea1-4526-92d3-e4f3f1182a53' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Oxford Hall Celtic Shop is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This charming Celtic-themed shop in New Cumberland offers Irish and Scottish gifts, imported goods, specialty teas, and chocolates — a unique stop blending culture and sweet treats.'
  WHERE restaurant_id = 'cc2026cc-cafe-4000-8000-000000000005' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Pennsylvania Bakery is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This relaxed, family-run Camp Hill bakery offers a wonderful range of cakes, pies, breads, and pastries alongside coffee drinks in a friendly neighborhood setting.'
  WHERE restaurant_id = '25dde809-10ac-41aa-bbcd-b042acf926dd' AND holiday_tag = 'coffee-chocolate-trail-2026';

  UPDATE holiday_specials SET description =
    'Mad Roast is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. This craft coffee roastery and cafe in Carlisle roasts small batches in-house and serves precision-brewed espresso and filter coffee to serious coffee enthusiasts. Formerly known as Crazy Glazed — the shop rebranded while the Crazy Glazed name lives on with their food truck.'
  WHERE restaurant_id = '433d16bf-5b6d-4962-aa6f-894b121d127d' AND holiday_tag = 'coffee-chocolate-trail-2026';

END $$;
