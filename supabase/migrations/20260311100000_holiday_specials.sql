-- Holiday specials table for seasonal/themed promotions (St. Patrick's Day, Cinco de Mayo, etc.)
CREATE TABLE IF NOT EXISTS public.holiday_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  holiday_tag TEXT NOT NULL,          -- e.g. 'st-patricks-2026', 'cinco-de-mayo-2026'
  name TEXT NOT NULL,                 -- e.g. '$3 Green Beer', 'Shamrock Shots'
  description TEXT,
  category TEXT DEFAULT 'drink',      -- 'drink', 'food', 'combo', 'entertainment'
  event_date DATE NOT NULL,           -- the holiday date
  start_time TIME,                    -- null = all day
  end_time TIME,
  original_price DECIMAL(10,2),
  special_price DECIMAL(10,2),
  discount_description TEXT,          -- e.g. '50% off', 'BOGO', '$2 off'
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_holiday_specials_holiday_tag ON public.holiday_specials(holiday_tag);
CREATE INDEX idx_holiday_specials_restaurant_id ON public.holiday_specials(restaurant_id);
CREATE INDEX idx_holiday_specials_event_date ON public.holiday_specials(event_date);

-- RLS policies
ALTER TABLE public.holiday_specials ENABLE ROW LEVEL SECURITY;

-- Anyone can read active holiday specials
CREATE POLICY "Anyone can read holiday specials"
  ON public.holiday_specials FOR SELECT
  USING (true);

-- Service role handles all writes (admin panel)
CREATE POLICY "Service role can manage holiday specials"
  ON public.holiday_specials FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_holiday_specials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_holiday_specials_updated_at
  BEFORE UPDATE ON public.holiday_specials
  FOR EACH ROW
  EXECUTE FUNCTION update_holiday_specials_updated_at();
