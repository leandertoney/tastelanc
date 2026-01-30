-- Add cover_image_url column to password_setup_tokens for personalized setup page
ALTER TABLE public.password_setup_tokens
ADD COLUMN IF NOT EXISTS cover_image_url text;

COMMENT ON COLUMN public.password_setup_tokens.cover_image_url IS 'Restaurant cover image URL for split-screen setup page';
