-- Add source column to analytics_clicks to distinguish internal vs external click origins
ALTER TABLE analytics_clicks
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'tastelanc',
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_analytics_clicks_source ON analytics_clicks(source);

-- Update existing rows to explicitly mark them as internal
UPDATE analytics_clicks SET source = 'tastelanc' WHERE source IS NULL;
