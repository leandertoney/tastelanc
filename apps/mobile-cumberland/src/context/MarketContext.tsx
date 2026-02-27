import { createContext, useContext, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { MARKET_SLUG } from '../config/market';
import { colors } from '../constants/colors';

export interface Market {
  id: string;
  name: string;
  slug: string;
  county: string;
  state: string;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_miles: number | null;
  is_active: boolean;
}

interface MarketContextType {
  market: Market | null;
  marketId: string | null;
  isLoading: boolean;
}

const MarketContext = createContext<MarketContextType | null>(null);

export function useMarket() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarket must be used within MarketProvider');
  }
  return context;
}

interface MarketProviderProps {
  children: ReactNode;
}

export function MarketProvider({ children }: MarketProviderProps) {
  // Uses the same cache key ['market', MARKET_SLUG] that SplashVideoScreen seeds.
  // If splash already ran, this returns the cached market instantly (no async gap).
  const { data: market = null, isLoading, isError, error } = useQuery({
    queryKey: ['market', MARKET_SLUG],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('markets')
        .select('*')
        .eq('slug', MARKET_SLUG)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (fetchError || !data) {
        throw new Error(
          `Market "${MARKET_SLUG}" not found or inactive: ${fetchError?.message}`
        );
      }
      return data as Market;
    },
    staleTime: 60 * 60 * 1000, // Market config rarely changes
  });

  const marketId = market?.id ?? null;

  // If market lookup failed, show a minimal fallback
  if (isError && !isLoading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {error instanceof Error
            ? error.message
            : `Market "${MARKET_SLUG}" not found. Please contact support.`}
        </Text>
      </View>
    );
  }

  return (
    <MarketContext.Provider value={{ market, marketId, isLoading }}>
      {children}
    </MarketContext.Provider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  errorText: {
    color: colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
});
