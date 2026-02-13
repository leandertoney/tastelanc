-- Multi-user access: restaurant team members
-- Allows Elite-tier restaurant owners to invite managers to their dashboard

CREATE TABLE IF NOT EXISTS public.restaurant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('owner', 'manager')),
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),

  UNIQUE(restaurant_id, email)
);

-- Indexes
CREATE INDEX idx_restaurant_members_user_active ON public.restaurant_members(user_id) WHERE status = 'active';
CREATE INDEX idx_restaurant_members_restaurant ON public.restaurant_members(restaurant_id);
CREATE INDEX idx_restaurant_members_email ON public.restaurant_members(email);

-- RLS
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;

-- Owners can see their restaurant's team members
CREATE POLICY "Owners can view restaurant members" ON public.restaurant_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants
      WHERE id = restaurant_id AND owner_id = auth.uid()
    )
  );

-- Members can see their own membership records
CREATE POLICY "Members can view own memberships" ON public.restaurant_members
  FOR SELECT USING (user_id = auth.uid());

-- Service role full access (for API routes using createServiceRoleClient)
CREATE POLICY "Service role full access restaurant_members" ON public.restaurant_members
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Updated_at trigger
CREATE TRIGGER update_restaurant_members_updated_at
  BEFORE UPDATE ON public.restaurant_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
