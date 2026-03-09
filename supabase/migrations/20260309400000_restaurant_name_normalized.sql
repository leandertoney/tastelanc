-- Add a stored generated column that strips apostrophes/hyphens for fuzzy search
-- Allows "cest la vie" to match "C'est la vie", "rumpelstiltskins" to match "Rumpelstiltskin's", etc.

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS name_normalized TEXT
  GENERATED ALWAYS AS (
    lower(regexp_replace(name, $re$['''\-]$re$, '', 'g'))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_restaurants_name_normalized
  ON restaurants(name_normalized);
