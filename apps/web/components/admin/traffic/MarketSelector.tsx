'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Market {
  id: string;
  name: string;
  slug: string;
}

interface MarketSelectorProps {
  value: string; // market ID or 'all'
  onChange: (marketId: string) => void;
}

export default function MarketSelector({ value, onChange }: MarketSelectorProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMarkets() {
      const supabase = createClient();
      const { data } = await supabase
        .from('markets')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (data) {
        setMarkets(data);
      }
      setLoading(false);
    }
    fetchMarkets();
  }, []);

  if (loading) {
    return (
      <div className="flex bg-tastelanc-surface rounded-lg p-1 gap-0.5">
        <div className="px-3 py-1.5 text-sm text-tastelanc-text-muted">Loading markets...</div>
      </div>
    );
  }

  const options = [
    { value: 'all', label: 'All Markets' },
    ...markets.map(m => ({ value: m.id, label: m.name }))
  ];

  return (
    <div className="flex bg-tastelanc-surface rounded-lg p-1 gap-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap ${
            value === option.value
              ? 'bg-tastelanc-accent text-white font-medium'
              : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
