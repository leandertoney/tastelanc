-- Add image_url column to specials table for custom special images
ALTER TABLE specials ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Comment for documentation
COMMENT ON COLUMN specials.image_url IS 'Custom image URL for special banner (optional, falls back to restaurant cover)';
