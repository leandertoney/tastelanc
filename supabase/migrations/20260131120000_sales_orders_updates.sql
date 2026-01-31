-- Add missing columns for multi-restaurant subscription flow

-- Add discounted_price_cents to sales_order_items
ALTER TABLE public.sales_order_items
ADD COLUMN IF NOT EXISTS discounted_price_cents INTEGER;

-- Add notes column to sales_orders for error tracking
ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update processing_status to handle new statuses
COMMENT ON COLUMN public.sales_order_items.processing_status IS 'Item status: pending, subscription_created, active, canceled, failed';

-- Add comment for new column
COMMENT ON COLUMN public.sales_order_items.discounted_price_cents IS 'Price after bulk discount applied (if any)';
