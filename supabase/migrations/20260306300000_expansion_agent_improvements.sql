-- Expansion Agent Improvements
-- 1. Mascot storytelling: add name_story and color_story to brand drafts
-- 2. City source tracking: manual vs auto for priority research

-- Mascot storytelling
ALTER TABLE expansion_brand_drafts ADD COLUMN IF NOT EXISTS name_story TEXT;
ALTER TABLE expansion_brand_drafts ADD COLUMN IF NOT EXISTS color_story TEXT;

-- City source tracking (manual vs auto)
ALTER TABLE expansion_cities ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'auto';
