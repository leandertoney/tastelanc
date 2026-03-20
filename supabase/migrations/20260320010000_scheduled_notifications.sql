-- Notification Content Calendar
-- One pre-generated notification per market per day.
-- Admin can approve, reject, or regenerate before the 11 AM send time.
-- If not approved by send time → skipped (nothing sends without explicit approval).

CREATE TABLE public.scheduled_notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Market identification
  market_id           UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  market_slug         TEXT NOT NULL,

  -- One per market per calendar day (ET date)
  scheduled_date      DATE NOT NULL,

  -- Notification content
  title               TEXT NOT NULL,
  body                TEXT NOT NULL,
  data_payload        JSONB NOT NULL DEFAULT '{}',
  -- { screen: 'RestaurantDetail', restaurantId: '...' }

  -- Source restaurant
  restaurant_id       UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  restaurant_name     TEXT NOT NULL,
  strategy            TEXT,
  -- e.g. 'discovery', 'specials', 'hidden_gem', 'event_tonight', etc.

  -- Approval workflow
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'sent', 'skipped')),
  rejection_reason    TEXT,
  reviewed_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,

  -- Audit
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at             TIMESTAMPTZ,
  generation_attempt  INT NOT NULL DEFAULT 1,
  -- increments on each regeneration so UI can show "2nd attempt" etc.

  -- One slot per market per day
  CONSTRAINT scheduled_notifications_market_date_unique
    UNIQUE (market_slug, scheduled_date)
);

-- Index: send-time gate check (status + date)
CREATE INDEX idx_sn_status_date
  ON public.scheduled_notifications (status, scheduled_date);

-- Index: admin calendar view (market + date)
CREATE INDEX idx_sn_market_date
  ON public.scheduled_notifications (market_slug, scheduled_date DESC);

-- Index: market_id join
CREATE INDEX idx_sn_market_id
  ON public.scheduled_notifications (market_id, scheduled_date DESC);

-- RLS: enable but no user-facing policies — all access via service role client in API routes
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;
