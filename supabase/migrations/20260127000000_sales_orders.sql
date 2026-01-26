-- Multi-restaurant sales orders for the admin sales dashboard
-- Stores cart details for multi-restaurant checkout since Stripe metadata has character limits

-- =====================
-- SALES ORDERS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer info
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  stripe_customer_id TEXT,

  -- Payment info
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, partially_failed, failed

  -- Cart summary
  restaurant_count INTEGER NOT NULL DEFAULT 1,
  discount_percent INTEGER NOT NULL DEFAULT 0,  -- 0, 10, 15, 20
  subtotal_cents INTEGER NOT NULL,
  discount_amount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Admin tracking
  created_by_admin TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

-- Service role has full access (admin operations via API routes)
DROP POLICY IF EXISTS "Service role full access on sales_orders" ON public.sales_orders;
CREATE POLICY "Service role full access on sales_orders" ON public.sales_orders
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_stripe_session ON public.sales_orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_email ON public.sales_orders(customer_email);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.sales_orders IS 'Multi-restaurant sales orders created by admin sales team';
COMMENT ON COLUMN public.sales_orders.status IS 'Order status: pending, processing, completed, partially_failed, failed';
COMMENT ON COLUMN public.sales_orders.discount_percent IS 'Volume discount: 0 (1 restaurant), 10 (2), 15 (3), 20 (4+)';

-- =====================
-- SALES ORDER ITEMS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,

  -- Restaurant info
  restaurant_id UUID REFERENCES public.restaurants(id),
  restaurant_name TEXT NOT NULL,
  is_new_restaurant BOOLEAN NOT NULL DEFAULT false,

  -- Plan info
  plan TEXT NOT NULL,       -- 'premium' or 'elite'
  duration TEXT NOT NULL,   -- '3mo', '6mo', 'yearly'
  price_cents INTEGER NOT NULL,

  -- Post-payment tracking
  stripe_subscription_id TEXT,
  linked_restaurant_id UUID REFERENCES public.restaurants(id),
  processing_status TEXT NOT NULL DEFAULT 'pending',  -- pending, subscription_created, canceled, failed
  processing_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access on sales_order_items" ON public.sales_order_items;
CREATE POLICY "Service role full access on sales_order_items" ON public.sales_order_items
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_restaurant ON public.sales_order_items(restaurant_id) WHERE restaurant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_order_items_subscription ON public.sales_order_items(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_sales_order_items_updated_at ON public.sales_order_items;
CREATE TRIGGER update_sales_order_items_updated_at
  BEFORE UPDATE ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.sales_order_items IS 'Individual restaurant items within a multi-restaurant sales order';
COMMENT ON COLUMN public.sales_order_items.processing_status IS 'Item status: pending, subscription_created, canceled, failed';
