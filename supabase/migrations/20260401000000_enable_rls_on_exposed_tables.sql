-- Fix: Enable RLS on tables flagged by Supabase security advisor (30 Mar 2026)
-- Tables: blog_posts, blog_generation_failures, expansion_reviews,
--         notification_logs, sales_commissions, sales_meetings

-- ── 1. blog_posts ──────────────────────────────────────────────────────────
-- Public can read published posts only. Writes via service role (API routes).

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_posts_public_read"
  ON public.blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "blog_posts_admin_all"
  ON public.blog_posts
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');


-- ── 2. blog_generation_failures ────────────────────────────────────────────
-- Internal — admin only, no public access.

ALTER TABLE public.blog_generation_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blog_generation_failures_admin_only"
  ON public.blog_generation_failures
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');


-- ── 3. expansion_reviews ───────────────────────────────────────────────────
-- Internal CRM — admin only.

ALTER TABLE public.expansion_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expansion_reviews_admin_only"
  ON public.expansion_reviews
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');


-- ── 4. notification_logs ───────────────────────────────────────────────────
-- Internal — admin only.

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_logs_admin_only"
  ON public.notification_logs
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');


-- ── 5. sales_commissions ───────────────────────────────────────────────────
-- Financial data. Sales reps see only their own rows. Admin sees all.
-- sales_reps.id links to auth.users.id via the same UUID.

ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_commissions_own_rep_read"
  ON public.sales_commissions
  FOR SELECT
  TO authenticated
  USING (
    sales_rep_id = auth.uid()
    OR auth.email() = 'admin@tastelanc.com'
  );

CREATE POLICY "sales_commissions_admin_write"
  ON public.sales_commissions
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');


-- ── 6. sales_meetings ──────────────────────────────────────────────────────
-- CRM data. Reps see meetings they created or are assigned to. Admin sees all.

ALTER TABLE public.sales_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_meetings_own_rep_read"
  ON public.sales_meetings
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR auth.email() = 'admin@tastelanc.com'
  );

CREATE POLICY "sales_meetings_admin_write"
  ON public.sales_meetings
  FOR ALL
  TO authenticated
  USING (auth.email() = 'admin@tastelanc.com');
