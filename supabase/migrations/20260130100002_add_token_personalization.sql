-- Add personalization columns to password_setup_tokens table
-- These fields allow for personalized account setup pages like "Hey Tony! Set up your Decades Lancaster dashboard"

ALTER TABLE public.password_setup_tokens
ADD COLUMN IF NOT EXISTS name text,
ADD COLUMN IF NOT EXISTS restaurant_name text;

-- Add comments for documentation
COMMENT ON COLUMN public.password_setup_tokens.name IS 'First name of the user for personalized setup page greeting';
COMMENT ON COLUMN public.password_setup_tokens.restaurant_name IS 'Restaurant name for personalized setup page context';
