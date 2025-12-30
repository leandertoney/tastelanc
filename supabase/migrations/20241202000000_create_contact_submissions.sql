-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  message TEXT NOT NULL,
  interested_plan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  notes TEXT
);

-- Enable RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can read all submissions
CREATE POLICY "Admin can read all contact submissions" ON contact_submissions
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Policy: Admin can update submissions (mark as read, add notes)
CREATE POLICY "Admin can update contact submissions" ON contact_submissions
  FOR UPDATE TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Policy: Anyone can insert (for the contact form)
CREATE POLICY "Anyone can submit contact form" ON contact_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_read_at ON contact_submissions(read_at);
