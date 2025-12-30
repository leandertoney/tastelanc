-- Create page_views table for analytics
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  visitor_id TEXT, -- anonymous visitor identifier from cookie
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert page views
CREATE POLICY "Anyone can track page views" ON page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Policy: Admin can read all page views
CREATE POLICY "Admin can read all page views" ON page_views
  FOR SELECT TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views(visitor_id);

-- Create a view for daily page views summary
CREATE OR REPLACE VIEW daily_page_views AS
SELECT
  DATE(created_at) as date,
  page_path,
  COUNT(*) as views,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM page_views
GROUP BY DATE(created_at), page_path
ORDER BY date DESC, views DESC;
