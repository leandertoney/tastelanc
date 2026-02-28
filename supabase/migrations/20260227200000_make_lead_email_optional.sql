-- Make email optional on business_leads for leads without contact info yet
ALTER TABLE business_leads ALTER COLUMN email DROP NOT NULL;

-- Drop the existing unique constraint on email
ALTER TABLE business_leads DROP CONSTRAINT IF EXISTS business_leads_email_key;

-- Re-add as partial unique index (only enforce uniqueness for non-null emails)
CREATE UNIQUE INDEX IF NOT EXISTS business_leads_email_unique
  ON business_leads (email)
  WHERE email IS NOT NULL AND email != '';
