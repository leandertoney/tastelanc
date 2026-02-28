-- Add avatar_image_url to brand drafts for DALL-E generated mascot images
ALTER TABLE expansion_brand_drafts
ADD COLUMN IF NOT EXISTS avatar_image_url text;

-- Ensure the expansion-avatars path is accessible in the images bucket
-- (No new bucket needed — we use the existing 'images' bucket)
