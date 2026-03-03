-- Add market_id to contact_submissions and early_access_signups
-- so admin dashboard can scope data by market for market_admin users

ALTER TABLE public.contact_submissions
ADD COLUMN IF NOT EXISTS market_id uuid REFERENCES public.markets(id);

ALTER TABLE public.early_access_signups
ADD COLUMN IF NOT EXISTS market_id uuid REFERENCES public.markets(id);

-- Create indexes for efficient market-scoped queries
CREATE INDEX IF NOT EXISTS idx_contact_submissions_market_id ON public.contact_submissions(market_id);
CREATE INDEX IF NOT EXISTS idx_early_access_signups_market_id ON public.early_access_signups(market_id);

-- Backfill existing rows: assign all current data to Lancaster (the original market)
-- since all existing data was created before multi-market support
UPDATE public.contact_submissions
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa' LIMIT 1)
WHERE market_id IS NULL;

UPDATE public.early_access_signups
SET market_id = (SELECT id FROM public.markets WHERE slug = 'lancaster-pa' LIMIT 1)
WHERE market_id IS NULL;
