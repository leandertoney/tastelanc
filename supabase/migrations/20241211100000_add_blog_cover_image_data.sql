-- Add cover_image_data column to blog_posts for editorial multi-image layouts
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS cover_image_data jsonb;

-- Add comment explaining the structure
COMMENT ON COLUMN blog_posts.cover_image_data IS 'JSON containing cover layout data: { type: single|dual|triple|quad|none, images: string[], layout: full|split-diagonal|split-vertical|grid|collage }';
