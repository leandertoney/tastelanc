-- Crazy Glazed (Carlisle) rebranded to Mad Roast.
-- The "Crazy Glazed" name moved to their food truck; the coffee shop is now Mad Roast.
-- UUID: 433d16bf-5b6d-4962-aa6f-894b121d127d

UPDATE restaurants
SET
  name        = 'Mad Roast',
  slug        = 'mad-roast-carlisle',
  categories  = ARRAY['cafe_coffee', 'breakfast', 'brunch'],
  description = 'Mad Roast is a specialty coffee shop in Carlisle, PA — formerly known as Crazy Glazed. The coffee shop rebranded to Mad Roast while the Crazy Glazed name lives on with their food truck. An official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.'
WHERE id = '433d16bf-5b6d-4962-aa6f-894b121d127d';

UPDATE holiday_specials
SET description = 'Mad Roast (formerly Crazy Glazed) is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Specialty coffee in Carlisle, PA — the coffee shop rebranded while Crazy Glazed lives on as their food truck.'
WHERE restaurant_id = '433d16bf-5b6d-4962-aa6f-894b121d127d'
  AND holiday_tag = 'coffee-chocolate-trail-2026';
