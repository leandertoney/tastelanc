'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Restaurant, SubscriptionTier, Tier } from '@/types/database';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  restaurants: Restaurant[];
  restaurantId: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  /** Whether current user is a team member (not owner) of the selected restaurant */
  isMember: boolean;
  /** Role of the team member ('manager') - only set when isMember is true */
  memberRole?: 'manager';
  isLoading: boolean;
  error: string | null;
  refreshRestaurant: () => Promise<void>;
  switchRestaurant: (id: string) => void;
  buildApiUrl: (path: string) => string;
  /** Current subscription tier name */
  tierName: SubscriptionTier | null;
  /** Full tier object with feature flags */
  tier: Tier | null;
}

const RestaurantContext = createContext<RestaurantContextType>({
  restaurant: null,
  restaurants: [],
  restaurantId: null,
  isAdmin: false,
  isOwner: false,
  isMember: false,
  isLoading: true,
  error: null,
  refreshRestaurant: async () => {},
  switchRestaurant: () => {},
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [tierMap, setTierMap] = useState<Record<string, Tier>>({});
  const [tier, setTier] = useState<Tier | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<'manager' | undefined>(undefined);
  const [ownershipMap, setOwnershipMap] = useState<Record<string, 'owner' | 'manager'>>({});
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
        setRestaurants([]);
        setTier(tierData as Tier || null);
        setIsOwner(false);
        setIsLoading(false);
        return;
      }

      // Normal mode - fetch ALL restaurants owned by this user
      const { data: ownedRestaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*, tiers(*)')
        .eq('owner_id', user.id)
        .order('name');

      // Also fetch restaurants where user is an active team member
      const { data: memberships } = await supabase
        .from('restaurant_members')
        .select('restaurant_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active');

      let memberRestaurants: any[] = [];
      if (memberships && memberships.length > 0) {
        const memberRestaurantIds = memberships.map((m: any) => m.restaurant_id);
        // Filter out any restaurants already owned (avoid duplicates)
        const ownedIds = new Set((ownedRestaurants || []).map((r: any) => r.id));
        const uniqueMemberIds = memberRestaurantIds.filter((id: string) => !ownedIds.has(id));

        if (uniqueMemberIds.length > 0) {
          const { data: memberRestData } = await supabase
            .from('restaurants')
            .select('*, tiers(*)')
            .in('id', uniqueMemberIds)
            .order('name');
          // Only include member restaurants that are on Elite tier
          memberRestaurants = (memberRestData || []).filter(
            (r: any) => r.tiers?.name === 'elite'
          );
        }
      }

      const allRestaurants = [...(ownedRestaurants || []), ...memberRestaurants];

      if (allRestaurants.length === 0) {
        if (userIsAdmin && !adminMode) {
          window.location.href = '/admin';
          return;
        }
        setError('No restaurant found for this account');
        setIsLoading(false);
        return;
      }

      // Build tier lookup, ownership map, and clean restaurant objects
      const tiers: Record<string, Tier> = {};
      const ownership: Record<string, 'owner' | 'manager'> = {};
      const cleanRestaurants: Restaurant[] = allRestaurants.map((r: any) => {
        const { tiers: tierData, ...rest } = r;
        if (tierData) {
          tiers[rest.id] = tierData as Tier;
        }
        return rest as Restaurant;
      });

      // Mark ownership: owned restaurants are 'owner', member restaurants are 'manager'
      const ownedIds = new Set((ownedRestaurants || []).map((r: any) => r.id));
      cleanRestaurants.forEach((r) => {
        ownership[r.id] = ownedIds.has(r.id) ? 'owner' : 'manager';
      });

      // Determine which restaurant to select
      let selectedId = cleanRestaurants[0].id;
      try {
        const storedId = localStorage.getItem('tastelanc_selected_restaurant');
        if (storedId && cleanRestaurants.some((r) => r.id === storedId)) {
          selectedId = storedId;
        }
      } catch {
        // localStorage unavailable
      }

      const selected = cleanRestaurants.find((r) => r.id === selectedId)!;
      const selectedOwnership = ownership[selected.id];
      setRestaurants(cleanRestaurants);
      setTierMap(tiers);
      setOwnershipMap(ownership);
      setRestaurant(selected);
      setTier(tiers[selected.id] || null);
      setIsOwner(selectedOwnership === 'owner');
      setIsMember(selectedOwnership === 'manager');
      setMemberRole(selectedOwnership === 'manager' ? 'manager' : undefined);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      setError('Failed to load restaurant');
      setIsLoading(false);
    }
  }, [adminMode, adminRestaurantId]);

  const switchRestaurant = useCallback((id: string) => {
    const target = restaurants.find((r) => r.id === id);
    if (!target) return;
    setRestaurant(target);
    setTier(tierMap[target.id] || null);
    const selectedOwnership = ownershipMap[target.id];
    setIsOwner(selectedOwnership === 'owner');
    setIsMember(selectedOwnership === 'manager');
    setMemberRole(selectedOwnership === 'manager' ? 'manager' : undefined);
    try {
      localStorage.setItem('tastelanc_selected_restaurant', id);
    } catch {
      // localStorage unavailable
    }
  }, [restaurants, tierMap, ownershipMap]);

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
    restaurants,
    restaurantId: restaurant?.id || null,
    isAdmin,
    isOwner,
    isMember,
    memberRole,
    isLoading,
    error,
    refreshRestaurant: fetchRestaurant,
    switchRestaurant,
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
