import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getSupabase } from '../config/theme';

const SALES_ROLES = ['sales_rep', 'super_admin', 'co_founder', 'market_admin'];

export function useSalesRole() {
  const { userId, isAnonymous } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['salesRole', userId],
    queryFn: async () => {
      if (!userId) return { isSalesRep: false, role: null };

      const supabase = getSupabase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      const role = profile?.role as string | null;
      return {
        isSalesRep: role ? SALES_ROLES.includes(role) : false,
        role,
      };
    },
    enabled: !!userId && !isAnonymous,
    staleTime: 30 * 60 * 1000, // 30 min — role rarely changes
    gcTime: 60 * 60 * 1000,
  });

  return {
    isSalesRep: data?.isSalesRep ?? false,
    role: data?.role ?? null,
    isLoading,
  };
}
