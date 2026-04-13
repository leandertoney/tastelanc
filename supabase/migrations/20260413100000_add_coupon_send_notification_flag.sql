-- Add send_notification flag to coupons table
-- This allows promotional/informational coupons to opt-out of push notifications

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS send_notification BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.coupons.send_notification IS 'If false, this coupon will not trigger push notifications. Use for promotional/informational deals that don''t warrant urgent alerts.';

-- Update existing Restaurant Week TFK prize coupons to not send notifications
UPDATE public.coupons
SET send_notification = false
WHERE title = '$25 TasteLanc Prize'
  AND cta_type = 'learn_more'
  AND start_date >= '2026-04-13'
  AND end_date <= '2026-04-19';
