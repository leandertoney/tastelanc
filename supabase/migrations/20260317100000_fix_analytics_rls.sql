-- Fix analytics RLS policies
-- Replace hardcoded admin@tastelanc.com email check with role-based policies
-- Add restaurant owner access to their own analytics data

-- Drop the old hardcoded email-based policies
DROP POLICY IF EXISTS "Admin can read analytics page views" ON public.analytics_page_views;
DROP POLICY IF EXISTS "Admin can read analytics clicks" ON public.analytics_clicks;

-- Admin roles can read all page views
CREATE POLICY "Admins can read all page views"
  ON public.analytics_page_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'co_founder', 'market_admin')
    )
  );

-- Admin roles can read all clicks
CREATE POLICY "Admins can read all clicks"
  ON public.analytics_clicks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'co_founder', 'market_admin')
    )
  );

-- Restaurant owners can read their own page views
CREATE POLICY "Restaurant owners can view own page views"
  ON public.analytics_page_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE id = analytics_page_views.restaurant_id
      AND owner_id = auth.uid()
    )
  );

-- Restaurant owners can read their own clicks
CREATE POLICY "Restaurant owners can view own clicks"
  ON public.analytics_clicks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE id = analytics_clicks.restaurant_id
      AND owner_id = auth.uid()
    )
  );
