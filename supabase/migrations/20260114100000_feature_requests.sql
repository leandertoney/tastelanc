-- Create feature_requests table for user-submitted feature suggestions
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'in_progress', 'completed', 'declined')),
  priority INTEGER CHECK (priority >= 1 AND priority <= 5),
  admin_notes TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can read all feature requests
CREATE POLICY "Admin can read all feature requests" ON feature_requests
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Policy: Admin can update feature requests
CREATE POLICY "Admin can update feature requests" ON feature_requests
  FOR UPDATE TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Policy: Admin can delete feature requests
CREATE POLICY "Admin can delete feature requests" ON feature_requests
  FOR DELETE TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Policy: Anyone can submit feature requests (authenticated or anonymous)
CREATE POLICY "Anyone can submit feature requests" ON feature_requests
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_read_at ON feature_requests(read_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feature_requests_updated_at
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_requests_updated_at();
