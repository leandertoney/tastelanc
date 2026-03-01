import { SupabaseClient } from '@supabase/supabase-js';
import { isUserAdmin } from '@/lib/auth/admin-access';
import { createServiceRoleClient } from '@/lib/supabase/server';

export interface SalesAccessResult {
  canAccess: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isMarketAdmin: boolean;
  isSalesRep: boolean;
  userId: string | null;
  email: string | null;
  marketIds: string[] | null; // null = unrestricted (super_admin/co_founder)
  error?: string;
}

export async function verifySalesAccess(
  supabase: SupabaseClient
): Promise<SalesAccessResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      canAccess: false,
      isAdmin: false,
      isSuperAdmin: false,
      isMarketAdmin: false,
      isSalesRep: false,
      userId: null,
      email: null,
      marketIds: null,
      error: 'Unauthorized',
    };
  }

  // Check profile role for admin tiers
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, admin_market_id')
    .eq('id', user.id)
    .single();

  const profileRole = profile?.role as string | null;
  const isSuperAdmin = profileRole === 'super_admin' || profileRole === 'co_founder';
  const isMarketAdmin = profileRole === 'market_admin';
  const isAdmin = isSuperAdmin || isMarketAdmin;
  const isSalesRep = user.user_metadata?.role === 'sales_rep';
  const canAccess = isAdmin || isSalesRep;

  // Determine market scope
  let marketIds: string[] | null = null;
  if (isSuperAdmin) {
    marketIds = null; // unrestricted
  } else if (isMarketAdmin && profile?.admin_market_id) {
    marketIds = [profile.admin_market_id];
  } else if (isSalesRep) {
    const serviceClient = createServiceRoleClient();
    const { data: rep } = await serviceClient
      .from('sales_reps')
      .select('market_ids')
      .eq('id', user.id)
      .single();
    marketIds = rep?.market_ids || [];
  }

  return {
    canAccess,
    isAdmin,
    isSuperAdmin,
    isMarketAdmin,
    isSalesRep,
    userId: user.id,
    email: user.email || null,
    marketIds,
    error: canAccess ? undefined : 'Sales access required',
  };
}
