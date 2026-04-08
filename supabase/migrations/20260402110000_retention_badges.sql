-- Retention: Badge System (Phase 1B)
-- badges: catalog of available achievements (global or market-scoped)
-- user_badges: awarded badges per user, market-scoped

-- ── 1. badges ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  icon_name   TEXT        NOT NULL,
  criteria    JSONB       NOT NULL DEFAULT '{}',
  market_id   UUID        REFERENCES public.markets(id) ON DELETE CASCADE,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS badges_market_id_idx
  ON public.badges(market_id)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS badges_sort_order_idx
  ON public.badges(sort_order)
  WHERE is_active = true;

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'badges' AND policyname = 'badges_public_read'
  ) THEN
    CREATE POLICY "badges_public_read"
      ON public.badges FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- ── 2. user_badges ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id    UUID        NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  market_id   UUID        NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  earned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id, market_id)
);

CREATE INDEX IF NOT EXISTS user_badges_user_market_idx
  ON public.user_badges(user_id, market_id);

CREATE INDEX IF NOT EXISTS user_badges_earned_at_idx
  ON public.user_badges(earned_at DESC);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'user_badges_own_read'
  ) THEN
    CREATE POLICY "user_badges_own_read"
      ON public.user_badges FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'user_badges_own_insert'
  ) THEN
    CREATE POLICY "user_badges_own_insert"
      ON public.user_badges FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── 3. Seed badge catalog ─────────────────────────────────────────────────────
INSERT INTO public.badges (name, description, icon_name, criteria, sort_order)
VALUES
  ('First Steps',      'Made your first check-in',            'footsteps',   '{"type":"checkin_count","threshold":1}',           1),
  ('Explorer',         'Visited 3 unique restaurants',         'map',         '{"type":"unique_restaurants","threshold":3}',       2),
  ('Happy Hour Hero',  'Checked in during happy hour',         'beer',        '{"type":"happy_hour_checkin","threshold":1}',       3),
  ('Weekend Warrior',  'Checked in on a Saturday or Sunday',   'sunny',       '{"type":"weekend_checkin","threshold":1}',          4),
  ('Local Regular',    'Visited 5 unique restaurants',         'ribbon',      '{"type":"unique_restaurants","threshold":5}',       5)
ON CONFLICT DO NOTHING;
