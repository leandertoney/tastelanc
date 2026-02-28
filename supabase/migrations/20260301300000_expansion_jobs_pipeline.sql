-- ============================================================
-- Expansion Jobs Pipeline: Applications table + job listing enhancements
-- ============================================================

-- 1. Job applications table
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_listing_id UUID REFERENCES public.expansion_job_listings(id) ON DELETE SET NULL,
  city_id UUID REFERENCES public.expansion_cities(id) ON DELETE SET NULL,
  -- Applicant info
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  linkedin TEXT,
  message TEXT,
  resume_url TEXT,
  -- Tracking
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'rejected', 'hired')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_city ON public.job_applications(city_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_listing ON public.job_applications(job_listing_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created ON public.job_applications(created_at DESC);

-- RLS: service role only (admin-managed)
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on job_applications"
  ON public.job_applications FOR ALL
  USING (true) WITH CHECK (true);

-- 2. Add columns to expansion_job_listings for posting
ALTER TABLE public.expansion_job_listings
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_through TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'CONTRACTOR',
  ADD COLUMN IF NOT EXISTS salary_min INTEGER,
  ADD COLUMN IF NOT EXISTS salary_max INTEGER,
  ADD COLUMN IF NOT EXISTS salary_unit TEXT DEFAULT 'MONTH';
