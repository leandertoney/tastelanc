-- Itinerary planning for TasteLanc
-- Enables users to create and save day plans with time-sequenced activities

-- =====================
-- ITINERARIES TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Lancaster Day',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- Users can manage their own itineraries
DROP POLICY IF EXISTS "Users can manage own itineraries" ON public.itineraries;
CREATE POLICY "Users can manage own itineraries" ON public.itineraries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON public.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_date ON public.itineraries(date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_itineraries_updated_at ON public.itineraries;
CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON public.itineraries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.itineraries IS 'User-created day plans for exploring Lancaster';
COMMENT ON COLUMN public.itineraries.is_generated IS 'Whether this itinerary was auto-generated vs manually built';

-- =====================
-- ITINERARY ITEMS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Time slot
  time_slot TEXT NOT NULL, -- 'breakfast', 'morning', 'lunch', 'afternoon', 'happy_hour', 'dinner', 'evening'
  start_time TIME,
  end_time TIME,

  -- What this item references (polymorphic)
  item_type TEXT NOT NULL DEFAULT 'restaurant', -- 'restaurant', 'event', 'happy_hour', 'custom'
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  happy_hour_id UUID REFERENCES public.happy_hours(id) ON DELETE SET NULL,

  -- Custom/override fields
  custom_title TEXT,
  custom_notes TEXT,

  -- Denormalized display fields (avoids extra joins, preserves historical data)
  display_name TEXT NOT NULL,
  display_address TEXT,
  display_latitude DECIMAL(10,8),
  display_longitude DECIMAL(11,8),
  display_image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;

-- Items inherit access from parent itinerary
DROP POLICY IF EXISTS "Users can manage own itinerary items" ON public.itinerary_items;
CREATE POLICY "Users can manage own itinerary items" ON public.itinerary_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = itinerary_items.itinerary_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.itineraries
      WHERE id = itinerary_items.itinerary_id
      AND user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itinerary ON public.itinerary_items(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_restaurant ON public.itinerary_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_sort ON public.itinerary_items(itinerary_id, sort_order);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_itinerary_items_updated_at ON public.itinerary_items;
CREATE TRIGGER update_itinerary_items_updated_at
  BEFORE UPDATE ON public.itinerary_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.itinerary_items IS 'Individual stops in a user itinerary';
COMMENT ON COLUMN public.itinerary_items.time_slot IS 'Logical slot: breakfast, morning, lunch, afternoon, happy_hour, dinner, evening';
COMMENT ON COLUMN public.itinerary_items.item_type IS 'Type of stop: restaurant, event, happy_hour, or custom';
COMMENT ON COLUMN public.itinerary_items.display_name IS 'Denormalized name for fast display and historical preservation';
