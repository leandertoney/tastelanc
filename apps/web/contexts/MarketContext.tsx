'use client';

/**
 * MarketContext — provides the current market's UUID to client components.
 *
 * The market slug is determined at build time via NEXT_PUBLIC_MARKET_SLUG.
 * This context fetches the market row from Supabase on mount and provides
 * the UUID (`marketId`) for use in data queries.
 *
 * For static branding (name, colors, SEO), import BRAND from '@/config/market' instead.
 * MarketContext is for runtime data queries that need `.eq('market_id', marketId)`.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MARKET_SLUG } from '@/config/market';

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

  const marketId = market?.id ?? null;

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      try {
        const { data, error } = await supabase
          .from('markets')
          .select('*')
          .eq('slug', MARKET_SLUG)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (error || !data) {
          console.error(
            `[MarketContext] Market "${MARKET_SLUG}" not found or inactive:`,
            error?.message,
          );
        } else {
          setMarket(data);
        }
      } catch (e) {
        console.error('[MarketContext] Exception fetching market:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <MarketContext.Provider value={{ market, marketId, isLoading }}>
      {children}
    </MarketContext.Provider>
  );
}

