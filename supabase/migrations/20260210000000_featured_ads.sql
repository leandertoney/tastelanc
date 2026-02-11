-- Featured Ads: self-serve ad inventory for local businesses
-- Displayed in the Featured for You carousel on the home screen

CREATE TABLE IF NOT EXISTS public.featured_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  click_url TEXT NOT NULL,
  tagline TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  priority SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_featured_ads_active
  ON public.featured_ads(is_active, priority DESC)
  WHERE is_active = true;

ALTER TABLE public.featured_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active ads"
  ON public.featured_ads
  FOR SELECT
  USING (true);

CREATE POLICY "Service role full access featured_ads"
  ON public.featured_ads
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Ad Events: impression + click tracking
CREATE TABLE IF NOT EXISTS public.ad_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.featured_ads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
  visitor_id TEXT NOT NULL,
  epoch_seed BIGINT NOT NULL,
  position_index SMALLINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ad_events_impression_dedup
  ON public.ad_events(ad_id, visitor_id, epoch_seed)
  WHERE event_type = 'impression';

CREATE INDEX IF NOT EXISTS idx_ad_events_ad_time
  ON public.ad_events(ad_id, created_at DESC);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert ad events"
  ON public.ad_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role full access ad_events"
  ON public.ad_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Reporting view: daily performance per ad
CREATE OR REPLACE VIEW public.ad_performance_summary AS
SELECT
  ae.ad_id,
  fa.business_name,
  DATE(ae.created_at) AS event_date,
  COUNT(*) FILTER (WHERE ae.event_type = 'impression') AS impressions,
  COUNT(DISTINCT ae.visitor_id) FILTER (WHERE ae.event_type = 'impression') AS unique_impressions,
  COUNT(*) FILTER (WHERE ae.event_type = 'click') AS clicks,
  CASE
    WHEN COUNT(*) FILTER (WHERE ae.event_type = 'impression') > 0
    THEN ROUND(
      (COUNT(*) FILTER (WHERE ae.event_type = 'click')::NUMERIC /
       COUNT(*) FILTER (WHERE ae.event_type = 'impression')) * 100, 2)
    ELSE 0
  END AS ctr_percent
FROM public.ad_events ae
JOIN public.featured_ads fa ON fa.id = ae.ad_id
GROUP BY ae.ad_id, fa.business_name, DATE(ae.created_at);
