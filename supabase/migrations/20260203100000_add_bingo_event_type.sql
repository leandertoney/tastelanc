-- Migration: Add bingo entertainment category
-- Migrate existing bingo events from 'other' to 'bingo'

-- Update events where name or description contains 'bingo' (case-insensitive)
UPDATE events
SET event_type = 'bingo'
WHERE event_type = 'other'
  AND (
    LOWER(name) LIKE '%bingo%'
    OR LOWER(description) LIKE '%bingo%'
  );
