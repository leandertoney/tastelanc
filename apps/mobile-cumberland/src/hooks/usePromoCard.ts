import { useState, useEffect, useCallback } from 'react';
import { shouldShowPromo, dismissPromo } from '../lib/promoStorage';

interface UsePromoCardResult {
  isVisible: boolean;
  isLoading: boolean;
  dismiss: (permanent?: boolean) => Promise<void>;
}

/**
 * Hook to manage promo card visibility state
 * Checks AsyncStorage on mount and provides dismiss functionality
 */
export function usePromoCard(): UsePromoCardResult {
  // Optimistic default: show promo immediately, then hide if previously dismissed
  // This prevents race conditions where fast-loading screens miss the promo
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkVisibility = async () => {
      const shouldShow = await shouldShowPromo();
      if (mounted) {
        setIsVisible(shouldShow);
        setIsLoading(false);
      }
    };

    checkVisibility();

    return () => {
      mounted = false;
    };
  }, []);

  const dismiss = useCallback(async (permanent: boolean = false) => {
    await dismissPromo(permanent);
    setIsVisible(false);
  }, []);

  return {
    isVisible,
    isLoading,
    dismiss,
  };
}
