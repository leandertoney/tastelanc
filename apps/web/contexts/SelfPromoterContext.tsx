'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export interface SelfPromoter {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string;
  bio: string | null;
  genre: string | null;
  profile_image_url: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SelfPromoterContextType {
  selfPromoter: SelfPromoter | null;
  selfPromoterId: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
  refreshSelfPromoter: () => Promise<void>;
  buildApiUrl: (path: string) => string;
  /** Whether subscription is active */
  isSubscribed: boolean;
}

const SelfPromoterContext = createContext<SelfPromoterContextType>({
  selfPromoter: null,
  selfPromoterId: null,
  isAdmin: false,
  isOwner: false,
  isLoading: true,
  error: null,
  refreshSelfPromoter: async () => {},
  buildApiUrl: (path: string) => path,
  isSubscribed: false,
});

export function useSelfPromoter() {
  const context = useContext(SelfPromoterContext);
  if (!context) {
    throw new Error('useSelfPromoter must be used within a SelfPromoterProvider');
  }
  return context;
}

interface SelfPromoterProviderProps {
  children: React.ReactNode;
}

export function SelfPromoterProvider({ children }: SelfPromoterProviderProps) {
  const searchParams = useSearchParams();
  const [selfPromoter, setSelfPromoter] = useState<SelfPromoter | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for admin mode from URL params
  const adminMode = searchParams.get('admin_mode') === 'true';
  const adminPromoterId = searchParams.get('promoter_id');

  const fetchSelfPromoter = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const userIsAdmin = user.email === 'admin@tastelanc.com';
      setIsAdmin(userIsAdmin);

      // If admin mode with specific promoter ID
      if (adminMode && adminPromoterId && userIsAdmin) {
        const { data: promoterData, error: promoterError } = await supabase
          .from('self_promoters')
          .select('*')
          .eq('id', adminPromoterId)
          .single();

        if (promoterError || !promoterData) {
          setError('Self-promoter not found');
          setIsLoading(false);
          return;
        }

        setSelfPromoter(promoterData as SelfPromoter);
        setIsOwner(false);
        setIsLoading(false);
        return;
      }

      // Normal owner mode - find self-promoter by owner_id
      const { data: promoterData, error: promoterError } = await supabase
        .from('self_promoters')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (promoterError || !promoterData) {
        setError('No self-promoter profile found for this account');
        setIsLoading(false);
        return;
      }

      setSelfPromoter(promoterData as SelfPromoter);
      setIsOwner(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching self-promoter:', err);
      setError('Failed to load profile');
      setIsLoading(false);
    }
  }, [adminMode, adminPromoterId]);

  useEffect(() => {
    fetchSelfPromoter();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSelfPromoter();
    });

    return () => subscription.unsubscribe();
  }, [fetchSelfPromoter]);

  // Helper to build API URLs with self_promoter_id
  const buildApiUrl = useCallback((path: string): string => {
    if (!selfPromoter?.id) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}self_promoter_id=${selfPromoter.id}`;
  }, [selfPromoter?.id]);

  const value: SelfPromoterContextType = {
    selfPromoter,
    selfPromoterId: selfPromoter?.id || null,
    isAdmin,
    isOwner,
    isLoading,
    error,
    refreshSelfPromoter: fetchSelfPromoter,
    buildApiUrl,
    isSubscribed: !!selfPromoter?.stripe_subscription_id,
  };

  return (
    <SelfPromoterContext.Provider value={value}>
      {children}
    </SelfPromoterContext.Provider>
  );
}
