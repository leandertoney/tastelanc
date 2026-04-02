import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyClaims } from '../lib/coupons';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from './useAuth';

/**
 * Returns a Set of coupon IDs the current user has actively claimed or redeemed.
 * Cancelled claims are excluded — the coupon is available again.
 * Returns an empty Set for unauthenticated users (no fetch made).
 */
export function useClaimedCouponIds(): Set<string> {
  const { userId } = useAuth();

  const { data: claims = [] } = useQuery({
    queryKey: queryKeys.coupons.myClaims,
    queryFn: getMyClaims,
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  return useMemo(
    () => new Set(
      claims
        .filter(c => c.status === 'claimed' || c.status === 'redeemed')
        .map(c => c.coupon.id)
    ),
    [claims]
  );
}
