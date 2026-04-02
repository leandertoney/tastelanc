-- =====================================================================
-- 20260402000000_thirsty_knowledge_partner.sql
-- Thirsty for Knowledge Trivia — partner hub
--
-- 1. Add partner_slug column to events
-- 2. Create trivia_leaderboard_entries table
-- 3. Insert phantom restaurant for unlinked franchise venues
-- 4. Seed all TFK weekly events
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. Add partner_slug to events
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS partner_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_events_partner_slug
  ON public.events(partner_slug)
  WHERE partner_slug IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────
-- 2. Trivia leaderboard table
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trivia_leaderboard_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id        UUID REFERENCES public.markets(id),
  week_start       DATE NOT NULL,
  nightly_date     DATE,           -- NULL = weekly/overall standing
  player_name      TEXT NOT NULL,
  score            INTEGER NOT NULL DEFAULT 0,
  venue_name       TEXT NOT NULL,
  position         INTEGER NOT NULL DEFAULT 1,
  is_winner        BOOLEAN NOT NULL DEFAULT false,
  prize_description TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.trivia_leaderboard_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trivia_leaderboard_public_read"
  ON public.trivia_leaderboard_entries
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Admin writes go through service-role client — no RLS write policy needed

CREATE INDEX IF NOT EXISTS idx_trivia_leaderboard_week
  ON public.trivia_leaderboard_entries(market_id, week_start, nightly_date);

-- ─────────────────────────────────────────────────────────────────────
-- 3. Phantom restaurant for franchise/unlinkable TFK venues
--    restaurant_id is NOT NULL on events (CHECK constraint requires
--    exactly one of restaurant_id OR self_promoter_id), so franchise
--    venues point here. is_active=false keeps it out of all app queries.
-- ─────────────────────────────────────────────────────────────────────
INSERT INTO public.restaurants (
  id, name, slug, address, city, state, is_active, market_id
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'TFK Franchise Venue',
  'tfk-franchise-venue',
  'Lancaster, PA',
  'Lancaster',
  'PA',
  false,
  (SELECT id FROM public.markets WHERE slug = 'lancaster-pa' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.restaurants
  WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- ─────────────────────────────────────────────────────────────────────
-- 4. Helper: resolve market_id once
-- ─────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_market_id UUID;
  v_phantom_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  SELECT id INTO v_market_id FROM public.markets WHERE slug = 'lancaster-pa' LIMIT 1;

  -- ── MONDAY ─────────────────────────────────────────────────────────

  -- BierHall Brewing — trivia (check linked; fallback to phantom)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = 'bierhall-brewing' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['monday'], '18:00:00',
    'BierHall Brewing with DJ Matt', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'monday' = ANY(days_of_week) AND performer_name = 'BierHall Brewing with DJ Matt'
  );

  -- 551 West — karaoke
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = '551-west' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Karaoke Night', 'karaoke', true, ARRAY['monday'], '21:00:00',
    '551 West with DJ Sid', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'monday' = ANY(days_of_week) AND performer_name = '551 West with DJ Sid'
  );

  -- ── TUESDAY ────────────────────────────────────────────────────────

  -- Our Town Brewery
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = 'our-town-brewery' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['tuesday'], '19:00:00',
    'Our Town Brewery with DJ Matt', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'tuesday' = ANY(days_of_week) AND performer_name = 'Our Town Brewery with DJ Matt'
  );

  -- Stubby's Bar and Grille (downtown Lancaster)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = 'stubbys-bar-and-grille' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['tuesday'], '19:00:00',
    'Stubby''s Bar and Grille (Downtown) with DJ Angel', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'tuesday' = ANY(days_of_week) AND performer_name = 'Stubby''s Bar and Grille (Downtown) with DJ Angel'
  );

  -- Appalachian Brewing Co. Lititz
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE (slug LIKE 'appalachian-brewing%' OR slug LIKE 'abc-lititz%') AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['tuesday'], '19:00:00',
    'Appalachian Brewing Co. Lititz with DJ Sid', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'tuesday' = ANY(days_of_week) AND performer_name = 'Appalachian Brewing Co. Lititz with DJ Sid'
  );

  -- Lucky Dog Cafe
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = 'lucky-dog-cafe' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['tuesday'], '19:00:00',
    'Lucky Dog Cafe with DJ Rachel', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'tuesday' = ANY(days_of_week) AND performer_name = 'Lucky Dog Cafe with DJ Rachel'
  );

  -- Union Station Grill
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = 'union-station-grill' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['tuesday'], '19:00:00',
    'Union Station Grill with DJ Jerry', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'tuesday' = ANY(days_of_week) AND performer_name = 'Union Station Grill with DJ Jerry'
  );

  -- Jack's Family Tavern (trivia Tue)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'jacks-family-tavern%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['tuesday'], '20:00:00',
    'Jack''s Family Tavern with DJ Luke', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'tuesday' = ANY(days_of_week) AND performer_name = 'Jack''s Family Tavern with DJ Luke'
  );

  -- ── WEDNESDAY ──────────────────────────────────────────────────────

  -- Collusion Tap Works Lititz
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'collusion-tap-works%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'Collusion Tap Works Lititz with DJ Bill', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Collusion Tap Works Lititz with DJ Bill'
  );

  -- Reflections Restaurant
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'reflections%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'Reflections Restaurant with DJ Red', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Reflections Restaurant with DJ Red'
  );

  -- Stubby's Bar and Grill (Oregon Pike)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'stubbys%oregon%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'Stubby''s Bar and Grill (Oregon Pike) with DJ Kate', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Stubby''s Bar and Grill (Oregon Pike) with DJ Kate'
  );

  -- Stoner Grille
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'stoner-grille%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'Stoner Grille with DJ Matt', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Stoner Grille with DJ Matt'
  );

  -- Southern Market Lancaster
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'southern-market%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'Southern Market Lancaster with DJ Bender', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Southern Market Lancaster with DJ Bender'
  );

  -- P.J. Whelihan's (Manheim Pike) — franchise, use phantom
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'P.J. Whelihan''s Pub + Restaurant with DJ Mike', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- P.J. Whelihan's (second location, Mr. Bill & Lori) — franchise
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'P.J. Whelihan''s Pub + Restaurant with Mr. Bill & Lori', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- Rumplebrewskin's
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'rumplebrewskins%' OR slug LIKE 'rumple%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'Rumplebrewskin''s with DJ Angel', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Rumplebrewskin''s with DJ Angel'
  );

  -- Marion Court Room
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'marion-court%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'Marion Court Room with DJ Greg', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Marion Court Room with DJ Greg'
  );

  -- New Town Food & Spirits (Wed trivia)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'new-town-food%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'New Town Food & Spirits with DJ Lisa', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'New Town Food & Spirits with DJ Lisa'
  );

  -- The Station House Tavern — Music Trivia (Wed)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'station-house-tavern%' OR slug LIKE 'the-station-house%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Music Trivia Night', 'trivia', true, ARRAY['wednesday'], '19:00:00',
    'The Station House Tavern with DJ Sid', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'The Station House Tavern with DJ Sid'
  );

  -- Lititz Springs VFW Post 1463 — Music Bingo (Wed) — franchise/unlinkable
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Music Bingo Night', 'music_bingo', true, ARRAY['wednesday'], '18:00:00',
    'Lititz Springs VFW Post 1463 with DJ Dustin', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- UnCommon Pizza — Music Bingo (Wed)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'uncommon-pizza%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Music Bingo Night', 'music_bingo', true, ARRAY['wednesday'], '19:00:00',
    'UnCommon Pizza with DJ Sherry', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'UnCommon Pizza with DJ Sherry'
  );

  -- Union Station Grill — Karaoke (Wed)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = 'union-station-grill' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Karaoke Night', 'karaoke', true, ARRAY['wednesday'], '21:00:00',
    'Union Station Grill with DJ Dave', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Union Station Grill with DJ Dave'
  );

  -- The Station House Tavern — Karaoke (Wed)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'station-house-tavern%' OR slug LIKE 'the-station-house%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Karaoke Night', 'karaoke', true, ARRAY['wednesday'], '21:00:00',
    'The Station House Tavern (Karaoke) with DJ Sid', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'The Station House Tavern (Karaoke) with DJ Sid'
  );

  -- Jack's Family Tavern — Karaoke (Wed)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'jacks-family-tavern%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Karaoke Night', 'karaoke', true, ARRAY['wednesday'], '22:00:00',
    'Jack''s Family Tavern (Karaoke) with DJ Luke', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'wednesday' = ANY(days_of_week) AND performer_name = 'Jack''s Family Tavern (Karaoke) with DJ Luke'
  );

  -- ── THURSDAY ───────────────────────────────────────────────────────

  -- Raney Cellars Brewing Company
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'raney-cellars%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['thursday'], '18:00:00',
    'Raney Cellars Brewing Company with DJ Kate', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Raney Cellars Brewing Company with DJ Kate'
  );

  -- Warehouse District Beer Garden
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'warehouse-district%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['thursday'], '18:30:00',
    'Warehouse District Beer Garden with DJ Greg', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Warehouse District Beer Garden with DJ Greg'
  );

  -- Columbia Kettle Works 2nd Gear
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'columbia-kettle-works%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['thursday'], '19:00:00',
    'Columbia Kettle Works 2nd Gear with DJ Jerry', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Columbia Kettle Works 2nd Gear with DJ Jerry'
  );

  -- Inspiration Brewing Company
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'inspiration-brewing%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Bar Trivia Night', 'trivia', true, ARRAY['thursday'], '19:00:00',
    'Inspiration Brewing Company with DJ Matt', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Inspiration Brewing Company with DJ Matt'
  );

  -- Southern Market Lancaster — Music Trivia (Thu)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'southern-market%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Music Trivia Night', 'trivia', true, ARRAY['thursday'], '19:00:00',
    'Southern Market Lancaster (Music Trivia) with DJ Sid & Sherry', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Southern Market Lancaster (Music Trivia) with DJ Sid & Sherry'
  );

  -- Lancaster Distilleries Boring Bar — Music Trivia (Thu)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'lancaster-distilleries%' OR slug LIKE 'boring-bar%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Music Trivia Night', 'trivia', true, ARRAY['thursday'], '19:00:00',
    'Lancaster Distilleries Boring Bar with DJ MGD', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Lancaster Distilleries Boring Bar with DJ MGD'
  );

  -- Union Station Grill — Music Bingo (Thu)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug = 'union-station-grill' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Music Bingo Night', 'music_bingo', true, ARRAY['thursday'], '19:00:00',
    'Union Station Grill (Music Bingo) with Mr. Bill & Lori', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Union Station Grill (Music Bingo) with Mr. Bill & Lori'
  );

  -- Southern Market Lancaster — Karaoke (Thu)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'southern-market%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Karaoke Night', 'karaoke', true, ARRAY['thursday'], '21:00:00',
    'Southern Market Lancaster (Karaoke) with DJ Sid', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'thursday' = ANY(days_of_week) AND performer_name = 'Southern Market Lancaster (Karaoke) with DJ Sid'
  );

  -- The Floating Squirrel — Karaoke (Thu) — franchise/unlinkable
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Karaoke Night', 'karaoke', true, ARRAY['thursday'], '21:00:00',
    'The Floating Squirrel with DJ Steve', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- ── FRIDAY ─────────────────────────────────────────────────────────

  -- Joe's Hideout — Karaoke (Fri) — franchise/unlinkable
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Karaoke Night', 'karaoke', true, ARRAY['friday'], '21:00:00',
    'Joe''s Hideout with DJ Bill', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- The Sandwich Factory Sports Lounge — Karaoke (Fri) — franchise/unlinkable
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Karaoke Night', 'karaoke', true, ARRAY['friday'], '22:00:00',
    'The Sandwich Factory Sports Lounge with Mr. Bill', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- ── SATURDAY ───────────────────────────────────────────────────────

  -- Joe's Hideout — Karaoke (Sat) — franchise/unlinkable
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Karaoke Night', 'karaoke', true, ARRAY['saturday'], '21:00:00',
    'Joe''s Hideout (Sat) with DJ Faith', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- The Cats Meow — Karaoke (Sat) — franchise/unlinkable
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Karaoke Night', 'karaoke', true, ARRAY['saturday'], '21:00:00',
    'The Cats Meow with Mr. Bill', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

  -- New Town Food & Spirits — Karaoke (Sat)
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  SELECT
    COALESCE(
      (SELECT id FROM public.restaurants WHERE slug LIKE 'new-town-food%' AND is_active = true LIMIT 1),
      v_phantom_id
    ),
    'Karaoke Night', 'karaoke', true, ARRAY['saturday'], '21:00:00',
    'New Town Food & Spirits (Sat Karaoke)', true, 'thirsty-for-knowledge', v_market_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.events WHERE partner_slug = 'thirsty-for-knowledge' AND 'saturday' = ANY(days_of_week) AND performer_name = 'New Town Food & Spirits (Sat Karaoke)'
  );

  -- ── SUNDAY ─────────────────────────────────────────────────────────

  -- Lititz Springs VFW Post 1463 — Trivia (Sun) — franchise/unlinkable
  INSERT INTO public.events (restaurant_id, name, event_type, is_recurring, days_of_week, start_time, performer_name, is_active, partner_slug, market_id)
  VALUES (
    v_phantom_id,
    'Bar Trivia Night', 'trivia', true, ARRAY['sunday'], '17:00:00',
    'Lititz Springs VFW Post 1463 with DJ Mac', true, 'thirsty-for-knowledge', v_market_id
  )
  ON CONFLICT DO NOTHING;

END $$;
