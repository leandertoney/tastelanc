-- Sales commissions tracking

CREATE TABLE IF NOT EXISTS sales_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID NOT NULL REFERENCES auth.users(id),
  lead_id UUID REFERENCES business_leads(id) ON DELETE SET NULL,
  business_name TEXT NOT NULL,
  plan_name TEXT NOT NULL,          -- 'Premium' or 'Elite'
  length_months INT NOT NULL,       -- 3, 6, or 12
  sale_amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  commission_rate NUMERIC(4,2) NOT NULL, -- 0.15 or 0.20
  is_renewal BOOLEAN DEFAULT false,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',    -- pending, paid, void
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_commissions_rep ON sales_commissions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_period ON sales_commissions(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_status ON sales_commissions(status);
CREATE INDEX IF NOT EXISTS idx_sales_commissions_sale_date ON sales_commissions(sale_date);
