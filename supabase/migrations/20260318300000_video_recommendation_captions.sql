-- Add caption and text overlay support to video recommendations.
-- caption_data: word-level timestamps from Whisper for synchronized subtitle display
-- text_overlays: user-added text overlays (position, color, size)
-- captions_enabled: whether the user opted into auto-generated captions

ALTER TABLE restaurant_recommendations
  ADD COLUMN IF NOT EXISTS caption_data JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS text_overlays JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS captions_enabled BOOLEAN NOT NULL DEFAULT FALSE;
