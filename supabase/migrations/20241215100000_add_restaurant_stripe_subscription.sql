-- Add stripe_subscription_id to restaurants table for direct subscription tracking
-- This allows quick lookup of which Stripe subscription powers a restaurant

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_stripe_subscription
ON public.restaurants(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.restaurants.stripe_subscription_id IS
'Stripe subscription ID for this restaurant, used for webhook handling and subscription management';
