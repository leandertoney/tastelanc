-- Add discovery_mode flag to markets table.
-- When true, Today's Pick features ALL active restaurants (no tier/content gating),
-- rotating through varied discovery copy templates. For early-stage markets where
-- the paid-tier pool is too small to produce useful notifications.

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS discovery_mode BOOLEAN NOT NULL DEFAULT false;

UPDATE public.markets
  SET discovery_mode = true
  WHERE slug = 'cumberland-pa';
