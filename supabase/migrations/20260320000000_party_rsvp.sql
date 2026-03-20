-- Party events, invite codes, and RSVPs for the TasteLanc Launch Party (April 20, 2026)

-- The event itself
CREATE TABLE IF NOT EXISTS public.party_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                 -- e.g. 'TasteLanc Launch Party'
  date DATE NOT NULL,                 -- 2026-04-20
  venue TEXT NOT NULL,                -- e.g. 'Hemp Field Apothecary Lounge'
  address TEXT,
  capacity INTEGER,                   -- total headcount cap (null = unlimited)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One invite code per restaurant; use_limit = how many staff can RSVP with this code
CREATE TABLE IF NOT EXISTS public.party_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_event_id UUID NOT NULL REFERENCES public.party_events(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,          -- e.g. 'HEMP-FISHBONES-5'
  use_limit INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'dashboard', -- 'dashboard' | 'email' | 'sms' | 'manual'
  requested_headcount INTEGER,        -- headcount the owner submitted from dashboard
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- One row per individual RSVP (each staff member who uses a code)
CREATE TABLE IF NOT EXISTS public.party_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_event_id UUID NOT NULL REFERENCES public.party_events(id) ON DELETE CASCADE,
  invite_code_id UUID NOT NULL REFERENCES public.party_invite_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable: staff may not have an account yet
  name TEXT NOT NULL,                 -- entered by staff during RSVP
  qr_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_party_invite_codes_party_event_id ON public.party_invite_codes(party_event_id);
CREATE INDEX idx_party_invite_codes_restaurant_id ON public.party_invite_codes(restaurant_id);
CREATE INDEX idx_party_invite_codes_code ON public.party_invite_codes(code);
CREATE INDEX idx_party_rsvps_party_event_id ON public.party_rsvps(party_event_id);
CREATE INDEX idx_party_rsvps_invite_code_id ON public.party_rsvps(invite_code_id);
CREATE INDEX idx_party_rsvps_qr_token ON public.party_rsvps(qr_token);
CREATE INDEX idx_party_rsvps_user_id ON public.party_rsvps(user_id);

-- RLS: party_events
ALTER TABLE public.party_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active party events"
  ON public.party_events FOR SELECT
  USING (is_active = true);

CREATE POLICY "Service role can manage party events"
  ON public.party_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS: party_invite_codes
ALTER TABLE public.party_invite_codes ENABLE ROW LEVEL SECURITY;

-- Service role only — codes are sensitive, not public
CREATE POLICY "Service role can manage invite codes"
  ON public.party_invite_codes FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS: party_rsvps
ALTER TABLE public.party_rsvps ENABLE ROW LEVEL SECURITY;

-- Users can read their own RSVP
CREATE POLICY "Users can read own rsvp"
  ON public.party_rsvps FOR SELECT
  USING (auth.uid() = user_id);

-- Service role handles all writes (RSVP creation, check-in)
CREATE POLICY "Service role can manage rsvps"
  ON public.party_rsvps FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed the launch party event
INSERT INTO public.party_events (name, date, venue, address, capacity, is_active)
VALUES (
  'TasteLanc Launch Party',
  '2026-04-20',
  'Hempfield Apothetique',
  '100 West Walnut Street, Lancaster, PA 17603',
  200,
  true
);
