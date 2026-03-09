-- Flyer-to-Event Scanner: event_drafts + scanner_rewards tables
-- Supports three publishing paths: venue_free, promoter_paid, send_to_organizer

-- ============================================================
-- event_drafts: holds scanned flyer data before publishing
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_image_url TEXT,
  extracted_json JSONB,
  edited_json JSONB,
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_claim', 'pending_payment', 'pending_review', 'published', 'rejected', 'expired')),
  publishing_path TEXT
    CHECK (publishing_path IN ('venue_free', 'promoter_paid', 'send_to_organizer')),
  matched_venue_id UUID REFERENCES public.restaurants(id),
  claim_token TEXT UNIQUE,
  claim_token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  published_event_id UUID REFERENCES public.events(id),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- scanner_rewards: credits earned when a claim converts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scanner_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanner_user_id UUID NOT NULL REFERENCES auth.users(id),
  draft_id UUID NOT NULL REFERENCES public.event_drafts(id),
  event_id UUID REFERENCES public.events(id),
  amount_credits INTEGER NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'earned', 'redeemed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_event_drafts_user ON public.event_drafts(created_by_user_id);
CREATE INDEX idx_event_drafts_status ON public.event_drafts(status);
CREATE INDEX idx_event_drafts_claim_token ON public.event_drafts(claim_token) WHERE claim_token IS NOT NULL;
CREATE INDEX idx_event_drafts_market ON public.event_drafts(market_id);
CREATE INDEX idx_scanner_rewards_user ON public.scanner_rewards(scanner_user_id);
CREATE INDEX idx_scanner_rewards_draft ON public.scanner_rewards(draft_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.event_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scanner_rewards ENABLE ROW LEVEL SECURITY;

-- Users can read their own drafts
CREATE POLICY "Users read own drafts"
  ON public.event_drafts FOR SELECT TO authenticated
  USING (auth.uid() = created_by_user_id);

-- Anyone can read a draft by claim_token (needed by public claim page)
CREATE POLICY "Public read by claim_token"
  ON public.event_drafts FOR SELECT
  USING (claim_token IS NOT NULL);

-- Service role full access
CREATE POLICY "Service role full access event_drafts"
  ON public.event_drafts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Scanner rewards: users can read their own
CREATE POLICY "Users read own scanner_rewards"
  ON public.scanner_rewards FOR SELECT TO authenticated
  USING (auth.uid() = scanner_user_id);

-- Service role full access
CREATE POLICY "Service role full access scanner_rewards"
  ON public.scanner_rewards FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- Triggers
-- ============================================================
CREATE TRIGGER update_event_drafts_updated_at
  BEFORE UPDATE ON public.event_drafts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
