import { createContext, useContext, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getSupabase, getBrand, getColors } from '../config/theme';

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
  const marketSlug = getBrand().marketSlug;
  const supabase = getSupabase();

  const { data: market = null, isLoading, isError, error } = useQuery({
    queryKey: ['market', marketSlug],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('markets')
        .select('*')
        .eq('slug', marketSlug)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (fetchError || !data) {
        throw new Error(
          `Market "${marketSlug}" not found or inactive: ${fetchError?.message}`
        );
      }
      return data as Market;
    },
    staleTime: 60 * 60 * 1000,
  });

  const marketId = market?.id ?? null;

  if (isError && !isLoading) {
    const colors = getColors();
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error instanceof Error
            ? error.message
            : `Market "${marketSlug}" not found. Please contact support.`}
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
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
