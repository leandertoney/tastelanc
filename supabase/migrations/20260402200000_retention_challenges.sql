-- Retention: Challenge System + Sponsored Challenges + Reward Claims
-- Phase 1C (challenges + progress) + Phase 2 (sponsor fields) + Phase 3 (claims)

-- ── 1. challenges ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.challenges (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT        NOT NULL,
  description           TEXT        NOT NULL,
  icon_name             TEXT        NOT NULL,
  challenge_type        TEXT        NOT NULL CHECK (
    challenge_type IN (
      'checkin_count',
      'unique_restaurants',
      'happy_hour_checkin',
      'cuisine_variety',
      'weekend_checkin',
      'streak'
    )
  ),
  target_count          INTEGER     NOT NULL DEFAULT 1,
  days_of_week          TEXT[],
  resets_weekly         BOOLEAN     NOT NULL DEFAULT false,
  -- Phase 2: sponsored challenge fields (app never validates/fulfills)
  sponsor_restaurant_id UUID        REFERENCES public.restaurants(id) ON DELETE SET NULL,
  reward_description    TEXT,
  -- Scoping (NULL = global across all markets)
  market_id             UUID        REFERENCES public.markets(id) ON DELETE CASCADE,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS challenges_market_active_idx
  ON public.challenges(market_id, is_active)
  WHERE is_active = true;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'challenges' AND policyname = 'challenges_public_read'
  ) THEN
    CREATE POLICY "challenges_public_read"
      ON public.challenges FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- ── 2. user_challenge_progress ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id   UUID        NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress_count INTEGER     NOT NULL DEFAULT 0,
  completed_at   TIMESTAMPTZ,
  -- For weekly-resetting challenges, this is the Monday of the week.
  -- For non-resetting challenges, this is NULL.
  week_start     DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Use a unique index on COALESCE so non-weekly challenges (week_start=NULL) also enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS ucp_user_challenge_week_unique
  ON public.user_challenge_progress(user_id, challenge_id, COALESCE(week_start, '1970-01-01'::date));

CREATE INDEX IF NOT EXISTS ucp_user_challenge_idx
  ON public.user_challenge_progress(user_id, challenge_id);

ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_challenge_progress' AND policyname = 'ucp_own_read'
  ) THEN
    CREATE POLICY "ucp_own_read"
      ON public.user_challenge_progress FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_challenge_progress' AND policyname = 'ucp_own_insert'
  ) THEN
    CREATE POLICY "ucp_own_insert"
      ON public.user_challenge_progress FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_challenge_progress' AND policyname = 'ucp_own_update'
  ) THEN
    CREATE POLICY "ucp_own_update"
      ON public.user_challenge_progress FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ucp_updated_at'
  ) THEN
    CREATE TRIGGER ucp_updated_at
      BEFORE UPDATE ON public.user_challenge_progress
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── 3. reward_claims (Phase 3) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reward_claims (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id             UUID        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  challenge_id              UUID        REFERENCES public.challenges(id) ON DELETE SET NULL,
  claim_token               UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  claimed_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at                TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
  is_redeemed               BOOLEAN     NOT NULL DEFAULT false,
  redemption_window_minutes INTEGER     NOT NULL DEFAULT 30
);

CREATE INDEX IF NOT EXISTS reward_claims_user_idx
  ON public.reward_claims(user_id, claimed_at DESC);

CREATE INDEX IF NOT EXISTS reward_claims_token_idx
  ON public.reward_claims(claim_token);

CREATE INDEX IF NOT EXISTS reward_claims_expires_idx
  ON public.reward_claims(expires_at)
  WHERE is_redeemed = false;

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reward_claims' AND policyname = 'reward_claims_own_read'
  ) THEN
    CREATE POLICY "reward_claims_own_read"
      ON public.reward_claims FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reward_claims' AND policyname = 'reward_claims_own_insert'
  ) THEN
    CREATE POLICY "reward_claims_own_insert"
      ON public.reward_claims FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'reward_claims' AND policyname = 'reward_claims_own_update'
  ) THEN
    CREATE POLICY "reward_claims_own_update"
      ON public.reward_claims FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. Seed example challenges ────────────────────────────────────────────────
INSERT INTO public.challenges (name, description, icon_name, challenge_type, target_count, resets_weekly, market_id)
VALUES
  ('Explorer Week',   'Visit 2 different restaurants this week', 'map-outline',        'unique_restaurants',  2, true,  NULL),
  ('Happy Hour Hero', 'Check in during a happy hour',            'beer-outline',        'happy_hour_checkin',  1, false, NULL),
  ('Cuisine Crawler', 'Try 3 different cuisines',                'restaurant-outline',  'cuisine_variety',     3, false, NULL)
ON CONFLICT DO NOTHING;
