-- Simplify party RSVP system: remove invite-code dependency, add response tracking
-- Existing RSVPs (Alexa Polites, Chris Grove) keep their invite_code_id intact.

-- 1. Make invite_code_id nullable (new RSVPs won't use codes)
ALTER TABLE public.party_rsvps
  ALTER COLUMN invite_code_id DROP NOT NULL;

-- 2. Add response column (yes/no tracking)
ALTER TABLE public.party_rsvps
  ADD COLUMN IF NOT EXISTS response TEXT NOT NULL DEFAULT 'yes'
    CHECK (response IN ('yes', 'no'));

-- 3. Add email column (required for web RSVPs, used for auto-linking to app accounts)
ALTER TABLE public.party_rsvps
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 4. Add restaurant_id directly on RSVP (replaces invite_code → restaurant join for new RSVPs)
ALTER TABLE public.party_rsvps
  ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL;

-- 5. Add source tracking (where the RSVP originated)
ALTER TABLE public.party_rsvps
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'link', 'dashboard'));

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_party_rsvps_response ON public.party_rsvps(response);
CREATE INDEX IF NOT EXISTS idx_party_rsvps_email ON public.party_rsvps(email) WHERE email IS NOT NULL;
