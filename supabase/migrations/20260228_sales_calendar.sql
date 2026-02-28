-- Sales Calendar: meetings / events for sales reps

CREATE TABLE IF NOT EXISTS sales_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  lead_id UUID REFERENCES business_leads(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  market_id UUID REFERENCES markets(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_meetings_date ON sales_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_created_by ON sales_meetings(created_by);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_lead_id ON sales_meetings(lead_id) WHERE lead_id IS NOT NULL;
