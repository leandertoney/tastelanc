'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Restaurant, SubscriptionTier, Tier } from '@/types/database';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  restaurantId: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  isLoading: boolean;
  error: string | null;
  refreshRestaurant: () => Promise<void>;
  buildApiUrl: (path: string) => string;
  /** Current subscription tier name */
  tierName: SubscriptionTier | null;
  /** Full tier object with feature flags */
  tier: Tier | null;
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  restaurantId: null,
  isAdmin: false,
  isOwner: false,
  isLoading: true,
  error: null,
  refreshRestaurant: async () => {},
  buildApiUrl: (path: string) => path,
  tierName: null,
  tier: null,
});

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

interface RestaurantProviderProps {
  children: React.ReactNode;
}

export function RestaurantProvider({ children }: RestaurantProviderProps) {
  const searchParams = useSearchParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tier, setTier] = useState<Tier | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for admin mode from URL params
  const adminMode = searchParams.get('admin_mode') === 'true';
  const adminRestaurantId = searchParams.get('restaurant_id');

  const fetchRestaurant = useCallback(async () => {
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

      // If admin mode with specific restaurant ID
      if (adminMode && adminRestaurantId && userIsAdmin) {
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*, tiers(*)')
          .eq('id', adminRestaurantId)
          .single();

        if (restaurantError || !restaurantData) {
          setError('Restaurant not found');
          setIsLoading(false);
          return;
        }

        const { tiers: tierData, ...rest } = restaurantData;
        setRestaurant(rest as Restaurant);
        setTier(tierData as Tier || null);
        setIsOwner(false);
        setIsLoading(false);
        return;
      }

      // Normal owner mode - find restaurant by owner_id
      // Use limit(1) instead of single() to handle owners with multiple restaurants
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*, tiers(*)')
        .eq('owner_id', user.id)
        .limit(1);

      const restaurantData = restaurants?.[0];

      if (restaurantError || !restaurantData) {
        // If admin is not in admin mode and has no restaurant, redirect to admin dashboard
        if (userIsAdmin && !adminMode) {
          window.location.href = '/admin';
          return;
        }
        setError('No restaurant found for this account');
        setIsLoading(false);
        return;
      }

      const { tiers: tierData, ...rest } = restaurantData;
      setRestaurant(rest as Restaurant);
      setTier(tierData as Tier || null);
      setIsOwner(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      setError('Failed to load restaurant');
      setIsLoading(false);
    }
  }, [adminMode, adminRestaurantId]);

  useEffect(() => {
    fetchRestaurant();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchRestaurant();
    });

    return () => subscription.unsubscribe();
  }, [fetchRestaurant]);

  // Helper to build API URLs with restaurant_id and admin_mode
  const buildApiUrl = useCallback((path: string): string => {
    if (!restaurant?.id) return path;
    const separator = path.includes('?') ? '&' : '?';
    let url = `${path}${separator}restaurant_id=${restaurant.id}`;
    // Add admin_mode parameter if in admin mode
    if (adminMode && isAdmin) {
      url += '&admin_mode=true';
    }
    return url;
  }, [restaurant?.id, adminMode, isAdmin]);

  const value: RestaurantContextType = {
    restaurant,
    restaurantId: restaurant?.id || null,
    isAdmin,
    isOwner,
    isLoading,
    error,
    refreshRestaurant: fetchRestaurant,
    buildApiUrl,
    tierName: tier?.name || null,
    tier,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}
