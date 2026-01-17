-- Update the Ever Grain beer event to 'promotion' type
-- This moves it from Entertainment section (small squares) to Upcoming Events section (big rectangles)

UPDATE events
SET event_type = 'promotion'
WHERE name = 'Ever Grain';
