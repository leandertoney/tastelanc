-- Create early_access_signups table for collecting emails
CREATE TABLE IF NOT EXISTS early_access_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'premium_page',
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  converted_at TIMESTAMPTZ,
  stripe_customer_id TEXT
);

-- Enable RLS
ALTER TABLE early_access_signups ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (for the signup form)
CREATE POLICY "Anyone can sign up for early access" ON early_access_signups
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Admin can read all signups
CREATE POLICY "Admin can read all early access signups" ON early_access_signups
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Policy: Admin can update signups
CREATE POLICY "Admin can update early access signups" ON early_access_signups
  FOR UPDATE TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_early_access_signups_email ON early_access_signups(email);
CREATE INDEX IF NOT EXISTS idx_early_access_signups_created_at ON early_access_signups(created_at DESC);
