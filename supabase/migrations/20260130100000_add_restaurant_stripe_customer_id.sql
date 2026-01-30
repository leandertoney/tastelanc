-- Add stripe_customer_id to restaurants table for better Stripe webhook matching
-- This allows matching subscriptions when created directly in Stripe dashboard

ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_stripe_customer
ON public.restaurants(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.restaurants.stripe_customer_id IS
'Stripe customer ID for this restaurant, used for webhook matching when subscriptions are created directly in Stripe';
