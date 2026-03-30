-- Add status + decline_reason to party_invite_codes
-- status: 'pending' | 'approved' | 'declined'
ALTER TABLE public.party_invite_codes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined')),
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Backfill existing rows: use_limit > 0 = approved, use_limit = 0 = pending
UPDATE public.party_invite_codes
  SET status = 'approved'
  WHERE use_limit > 0;

UPDATE public.party_invite_codes
  SET status = 'pending'
  WHERE use_limit = 0;
