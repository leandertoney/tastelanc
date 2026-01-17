-- Add image_url column to happy_hours for custom banner images
ALTER TABLE happy_hours ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Comment
COMMENT ON COLUMN happy_hours.image_url IS 'Custom image URL for happy hour banner (optional, falls back to restaurant cover)';
