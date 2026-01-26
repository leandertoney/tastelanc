-- Area-based geofencing for TasteLanc
-- Enables neighborhood/district geofences with first-visit notifications

-- =====================
-- AREAS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  radius INTEGER NOT NULL DEFAULT 750, -- meters (larger than restaurant 75m)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Public read access for active areas
DROP POLICY IF EXISTS "Public read access on areas" ON public.areas;
CREATE POLICY "Public read access on areas" ON public.areas
  FOR SELECT USING (is_active = true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full access on areas" ON public.areas;
CREATE POLICY "Service role full access on areas" ON public.areas
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_areas_is_active ON public.areas(is_active);
CREATE INDEX IF NOT EXISTS idx_areas_slug ON public.areas(slug);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_areas_updated_at ON public.areas;
CREATE TRIGGER update_areas_updated_at
  BEFORE UPDATE ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.areas IS 'Predefined geographic areas/neighborhoods for geofencing';
COMMENT ON COLUMN public.areas.radius IS 'Geofence radius in meters (default 750m for neighborhoods)';

-- =====================
-- AREA VISITS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS public.area_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  first_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count INTEGER NOT NULL DEFAULT 1,
  last_visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, area_id)
);

-- Enable RLS
ALTER TABLE public.area_visits ENABLE ROW LEVEL SECURITY;

-- Users can read their own area visits
DROP POLICY IF EXISTS "Users can read own area visits" ON public.area_visits;
CREATE POLICY "Users can read own area visits" ON public.area_visits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Service role full access (for backend recording)
DROP POLICY IF EXISTS "Service role full access on area_visits" ON public.area_visits;
CREATE POLICY "Service role full access on area_visits" ON public.area_visits
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_area_visits_user_id ON public.area_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_area_visits_area_id ON public.area_visits(area_id);
CREATE INDEX IF NOT EXISTS idx_area_visits_user_area ON public.area_visits(user_id, area_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_area_visits_updated_at ON public.area_visits;
CREATE TRIGGER update_area_visits_updated_at
  BEFORE UPDATE ON public.area_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Comments
COMMENT ON TABLE public.area_visits IS 'Tracks user visits to geographic areas for personalization';
COMMENT ON COLUMN public.area_visits.notification_sent IS 'Whether first-visit notification was sent';
COMMENT ON COLUMN public.area_visits.visit_count IS 'Number of times user has entered this area';

-- =====================
-- SEED LANCASTER AREAS
-- =====================

INSERT INTO public.areas (name, slug, description, latitude, longitude, radius) VALUES
  ('Downtown Lancaster', 'downtown', 'Historic downtown area with Central Market, Penn Square, and Gallery Row', 40.0379, -76.3055, 800),
  ('College Hill', 'college-hill', 'Franklin & Marshall College neighborhood with local cafes and eateries', 40.0450, -76.3150, 600),
  ('East King Street', 'east-king', 'Dining corridor along East King Street', 40.0379, -76.2950, 600),
  ('Lancaster West End', 'west-end', 'Growing food scene west of downtown', 40.0380, -76.3180, 700),
  ('Lititz Pike Corridor', 'lititz-pike', 'Commercial dining area along Lititz Pike', 40.0550, -76.3100, 900),
  ('Manheim Township', 'manheim-township', 'Suburban dining options in Manheim Township', 40.0700, -76.3200, 1000)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  radius = EXCLUDED.radius;
