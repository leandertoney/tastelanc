-- Sales Rep Role: lead_activities table, sales_reps table, assigned_to column

-- 1. lead_activities table - interaction history per lead
CREATE TABLE IF NOT EXISTS public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.business_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'follow_up', 'status_change')),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on lead_activities" ON public.lead_activities
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can read own lead_activities" ON public.lead_activities
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_user_id ON public.lead_activities(user_id);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- 2. sales_reps table - profile and market assignments
CREATE TABLE IF NOT EXISTS public.sales_reps (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  market_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on sales_reps" ON public.sales_reps
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Sales reps can read own profile" ON public.sales_reps
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE TRIGGER update_sales_reps_updated_at
  BEFORE UPDATE ON public.sales_reps
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. Add assigned_to column to business_leads
ALTER TABLE public.business_leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_business_leads_assigned_to
  ON public.business_leads(assigned_to)
  WHERE assigned_to IS NOT NULL;
