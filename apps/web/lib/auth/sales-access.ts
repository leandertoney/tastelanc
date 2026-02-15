import { SupabaseClient } from '@supabase/supabase-js';

export interface SalesAccessResult {
  canAccess: boolean;
  isAdmin: boolean;
  isSalesRep: boolean;
  userId: string | null;
  email: string | null;
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
      isSalesRep: false,
      userId: null,
      email: null,
      error: 'Unauthorized',
    };
  }

  const isAdmin = user.email === 'admin@tastelanc.com';
  const isSalesRep = user.user_metadata?.role === 'sales_rep';
  const canAccess = isAdmin || isSalesRep;

  return {
    canAccess,
    isAdmin,
    isSalesRep,
    userId: user.id,
    email: user.email || null,
    error: canAccess ? undefined : 'Sales access required',
  };
}
