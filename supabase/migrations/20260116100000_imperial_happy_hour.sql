-- Add Happy Hour data for The Imperial Restaurant
-- Daily 4pm-7pm: $5 drafts, $8 wine, $5 wells, half off bar menu

-- Insert the happy hour entry
INSERT INTO happy_hours (restaurant_id, name, description, days_of_week, start_time, end_time, is_active)
VALUES (
  '28b029d8-171b-4e05-9a2e-628e8e1d6f7d',
  'Daily Happy Hour',
  '$5 drafts, $8 wine, $5 wells + half off bar menu',
  ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  '16:00:00',
  '19:00:00',
  true
)
ON CONFLICT DO NOTHING;

-- Insert happy hour items
WITH hh AS (
  SELECT id FROM happy_hours
  WHERE restaurant_id = '28b029d8-171b-4e05-9a2e-628e8e1d6f7d'
  LIMIT 1
)
INSERT INTO happy_hour_items (happy_hour_id, name, discount_description, display_order)
SELECT hh.id, name, discount_description, display_order FROM hh, (VALUES
  ('Draft Beer', '$5', 1),
  ('Glass of Wine', '$8', 2),
  ('Well Liquor', '$5', 3),
  ('Bar Menu Food', '50% off', 4)
) AS items(name, discount_description, display_order)
ON CONFLICT DO NOTHING;
