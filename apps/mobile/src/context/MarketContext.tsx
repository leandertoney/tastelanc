import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { MARKET_SLUG } from '../config/market';

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
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const marketId = market?.id ?? null;

  // Fetch the single locked market by slug on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('markets')
          .select('*')
          .eq('slug', MARKET_SLUG)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (fetchError || !data) {
          console.error(
            `[MarketContext] Market "${MARKET_SLUG}" not found or inactive:`,
            fetchError?.message,
          );
          setError(`Market "${MARKET_SLUG}" not found. Please contact support.`);
        } else {
          setMarket(data);
        }
      } catch (e) {
        console.error('[MarketContext] Exception fetching market:', e);
        setError('Failed to load market configuration.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // If market lookup failed, show a minimal fallback
  if (error && !isLoading) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
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
    backgroundColor: '#121212',
    padding: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
