-- Add app_icon_url to brand drafts for DALL-E generated app icons
ALTER TABLE expansion_brand_drafts
ADD COLUMN IF NOT EXISTS app_icon_url TEXT;
