-- Base Schema for TasteLanc
-- This creates all core tables that the other migrations depend on

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- CORE TABLES
-- =====================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tiers (subscription tiers for restaurants)
CREATE TABLE IF NOT EXISTS public.tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  has_logo BOOLEAN DEFAULT false,
  has_menu BOOLEAN DEFAULT false,
  has_analytics BOOLEAN DEFAULT false,
  has_push_notifications BOOLEAN DEFAULT false,
  has_preferred_placement BOOLEAN DEFAULT false,
  has_social_features BOOLEAN DEFAULT false,
  has_unlimited_pushes BOOLEAN DEFAULT false,
  has_weekly_updates BOOLEAN DEFAULT false,
  has_custom_ads BOOLEAN DEFAULT false,
  has_consulting BOOLEAN DEFAULT false,
  has_advanced_analytics BOOLEAN DEFAULT false,
  max_daily_notifications INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restaurants
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tier_id UUID REFERENCES public.tiers(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Lancaster',
  state TEXT NOT NULL DEFAULT 'PA',
  zip_code TEXT,
  phone TEXT,
  website TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  logo_url TEXT,
  cover_image_url TEXT,
  description TEXT,
  primary_color TEXT DEFAULT '#E63946',
  secondary_color TEXT DEFAULT '#1D3557',
  categories TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Enrichment fields
  price_range TEXT,
  signature_dishes TEXT[],
  vibe_tags TEXT[],
  best_for TEXT[],
  neighborhood TEXT,
  parking_info TEXT,
  noise_level TEXT,
  average_rating DECIMAL(2,1),
  reservation_links TEXT,
  stripe_subscription_id TEXT
);

-- Restaurant Hours
CREATE TABLE IF NOT EXISTS public.restaurant_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, day_of_week)
);

-- Restaurant Photos
CREATE TABLE IF NOT EXISTS public.restaurant_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  is_cover BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (B2B restaurant subscriptions)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.tiers(id),
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- CONTENT TABLES
-- =====================

-- Menus
CREATE TABLE IF NOT EXISTS public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Sections
CREATE TABLE IF NOT EXISTS public.menu_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.menu_sections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  price_description TEXT,
  is_available BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  dietary_flags TEXT[] DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Happy Hours
CREATE TABLE IF NOT EXISTS public.happy_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  days_of_week TEXT[] NOT NULL DEFAULT '{}',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Happy Hour Items
CREATE TABLE IF NOT EXISTS public.happy_hour_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  happy_hour_id UUID NOT NULL REFERENCES public.happy_hours(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  original_price DECIMAL(10,2),
  discounted_price DECIMAL(10,2),
  discount_description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Specials
CREATE TABLE IF NOT EXISTS public.specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_recurring BOOLEAN DEFAULT false,
  days_of_week TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  original_price DECIMAL(10,2),
  special_price DECIMAL(10,2),
  discount_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'other',
  is_recurring BOOLEAN DEFAULT false,
  days_of_week TEXT[] DEFAULT '{}',
  event_date DATE,
  start_time TIME NOT NULL,
  end_time TIME,
  performer_name TEXT,
  cover_charge DECIMAL(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- USER INTERACTION TABLES
-- =====================

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

-- Votes
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category, month)
);

-- Vote Balances
CREATE TABLE IF NOT EXISTS public.vote_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  votes_remaining INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.happy_hour_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_balances ENABLE ROW LEVEL SECURITY;

-- Public read access for most tables
CREATE POLICY "Public read access" ON public.tiers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.restaurants FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access" ON public.restaurant_hours FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.restaurant_photos FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.menus FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access" ON public.menu_sections FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.menu_items FOR SELECT USING (is_available = true);
CREATE POLICY "Public read access" ON public.happy_hours FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access" ON public.happy_hour_items FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.specials FOR SELECT USING (is_active = true);
CREATE POLICY "Public read access" ON public.events FOR SELECT USING (is_active = true);

-- Profile policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Restaurant owner policies
CREATE POLICY "Owners can update own restaurants" ON public.restaurants FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can manage restaurant hours" ON public.restaurant_hours FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can manage restaurant photos" ON public.restaurant_photos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can manage menus" ON public.menus FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can manage menu sections" ON public.menu_sections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.menus m JOIN public.restaurants r ON m.restaurant_id = r.id WHERE m.id = menu_id AND r.owner_id = auth.uid())
);
CREATE POLICY "Owners can manage menu items" ON public.menu_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.menu_sections ms JOIN public.menus m ON ms.menu_id = m.id JOIN public.restaurants r ON m.restaurant_id = r.id WHERE ms.id = section_id AND r.owner_id = auth.uid())
);
CREATE POLICY "Owners can manage happy hours" ON public.happy_hours FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can manage happy hour items" ON public.happy_hour_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.happy_hours hh JOIN public.restaurants r ON hh.restaurant_id = r.id WHERE hh.id = happy_hour_id AND r.owner_id = auth.uid())
);
CREATE POLICY "Owners can manage specials" ON public.specials FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);
CREATE POLICY "Owners can manage events" ON public.events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.restaurants WHERE id = restaurant_id AND owner_id = auth.uid())
);

-- User interaction policies
CREATE POLICY "Users can manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own votes" ON public.votes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own vote balance" ON public.vote_balances FOR ALL USING (auth.uid() = user_id);

-- Service role full access (for backend operations)
CREATE POLICY "Service role full access profiles" ON public.profiles FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access restaurants" ON public.restaurants FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access subscriptions" ON public.subscriptions FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================
-- SEED DATA
-- =====================

-- Insert default tiers
INSERT INTO public.tiers (id, name, display_name, price_monthly, price_yearly, has_logo, has_menu, has_analytics) VALUES
  ('00000000-0000-0000-0000-000000000001', 'basic', 'Basic', 0, 0, false, false, false),
  ('00000000-0000-0000-0000-000000000002', 'premium', 'Premium', 49.99, 499.99, true, true, true),
  ('00000000-0000-0000-0000-000000000003', 'elite', 'Elite', 99.99, 999.99, true, true, true)
ON CONFLICT (name) DO NOTHING;

-- =====================
-- TRIGGERS
-- =====================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_restaurant_hours_updated_at BEFORE UPDATE ON public.restaurant_hours FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_menu_sections_updated_at BEFORE UPDATE ON public.menu_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_happy_hours_updated_at BEFORE UPDATE ON public.happy_hours FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_happy_hour_items_updated_at BEFORE UPDATE ON public.happy_hour_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_specials_updated_at BEFORE UPDATE ON public.specials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_vote_balances_updated_at BEFORE UPDATE ON public.vote_balances FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The auth trigger should be created separately as it requires special permissions
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
