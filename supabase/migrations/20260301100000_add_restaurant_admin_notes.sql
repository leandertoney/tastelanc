-- Add admin_notes column to restaurants for internal admin use
ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS admin_notes TEXT;
