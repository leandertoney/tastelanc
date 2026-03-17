-- Voice AI Sales Agent
-- Adds voice_transcripts + agent_activity_log tables
-- Extends existing sales_meetings table with voice-agent columns

-- Voice conversation transcripts
CREATE TABLE IF NOT EXISTS voice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES business_leads(id) ON DELETE SET NULL,
  market_id UUID NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  duration_seconds INTEGER,
  transcript JSONB DEFAULT '[]'::jsonb,
  summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  intent TEXT[] DEFAULT '{}',
  outcome TEXT CHECK (outcome IN (
    'meeting_booked', 'follow_up', 'not_interested',
    'sale_closed', 'transferred', 'abandoned', 'browsing'
  )),
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend existing sales_meetings with voice-agent columns
ALTER TABLE sales_meetings
  ADD COLUMN IF NOT EXISTS booked_by TEXT DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'demo',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS transcript_id UUID REFERENCES voice_transcripts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmation_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Agent activity log (every action the agent takes)
CREATE TABLE IF NOT EXISTS agent_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  lead_id UUID REFERENCES business_leads(id) ON DELETE SET NULL,
  transcript_id UUID REFERENCES voice_transcripts(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_market ON voice_transcripts(market_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_created ON voice_transcripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_outcome ON voice_transcripts(outcome);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_lead ON voice_transcripts(lead_id);

CREATE INDEX IF NOT EXISTS idx_agent_activity_market ON agent_activity_log(market_id);
CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_activity_type ON agent_activity_log(action_type);

CREATE INDEX IF NOT EXISTS idx_sales_meetings_booked_by ON sales_meetings(booked_by);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_status_voice ON sales_meetings(status);
CREATE INDEX IF NOT EXISTS idx_sales_meetings_transcript ON sales_meetings(transcript_id) WHERE transcript_id IS NOT NULL;

-- RLS policies
ALTER TABLE voice_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and sales reps can view voice transcripts"
  ON voice_transcripts FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'co_founder', 'market_admin')
    )
    OR auth.uid() IN (
      SELECT id FROM sales_reps WHERE is_active = true
    )
  );

CREATE POLICY "Admins and sales reps can view agent activity"
  ON agent_activity_log FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('super_admin', 'co_founder', 'market_admin')
    )
    OR auth.uid() IN (
      SELECT id FROM sales_reps WHERE is_active = true
    )
  );
