-- Drop checkin_pin column from restaurants table
-- PIN check-in feature removed; replaced by geofence-verified "I'm Here" rewards
ALTER TABLE restaurants DROP COLUMN IF EXISTS checkin_pin;
