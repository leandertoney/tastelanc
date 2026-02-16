'use client';

/**
 * OtherCitiesFooter — "Other Cities" section for the footer.
 *
 * Queries the `markets` table for all active markets, excludes the current one,
 * and renders links to other city domains using MARKET_CONFIG.
 */

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { MARKET_SLUG, getMarketConfig } from '@/config/market';

interface OtherCity {
  slug: string;
  name: string;
  domain: string;
}

export default function OtherCitiesFooter() {
  const [cities, setCities] = useState<OtherCity[]>([]);

  useEffect(() => {
    const supabase = createClient();

    (async () => {
      const { data, error } = await supabase
        .from('markets')
        .select('slug, name')
        .eq('is_active', true)
        .neq('slug', MARKET_SLUG)
        .order('name');

      if (error || !data) return;

      const resolved: OtherCity[] = data
        .map((m) => {
          const config = getMarketConfig(m.slug);
          if (!config) return null;
          return {
            slug: m.slug,
            name: config.name,
            domain: config.domain,
          };
        })
        .filter(Boolean) as OtherCity[];

      setCities(resolved);
    })();
  }, []);

  if (cities.length === 0) return null;

  return (
    <div>
      <h4 className="font-semibold text-white mb-3">Other Cities</h4>
      <ul className="space-y-2 text-sm text-gray-400">
        {cities.map((city) => (
          <li key={city.slug}>
            <a
              href={`https://${city.domain}`}
              className="hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              {city.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
