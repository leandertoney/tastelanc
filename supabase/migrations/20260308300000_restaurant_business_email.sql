-- Add business_email column to restaurants for generic website-scraped emails
-- This is separate from contact_email (direct/personal contact info)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS business_email text;
