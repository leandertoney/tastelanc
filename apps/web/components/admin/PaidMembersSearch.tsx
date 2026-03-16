'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'consumers', label: 'Consumers' },
  { value: 'self-promoters', label: 'Self-Promoters' },
  { value: 'promotional', label: 'Demo/Free' },
] as const;

const STATUS_FILTERS = [
  { value: 'all', label: 'Any Status' },
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trialing' },
] as const;

export default function PaidMembersSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const currentType = searchParams.get('type') || 'all';
  const currentStatus = searchParams.get('status') || 'all';

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value && value !== 'all') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.replace(`?${params.toString()}`);
  }, [router, searchParams]);

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParams({ q: search.trim() || null });
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Search input — centered */}
      <div className="relative w-full max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
        <input
          type="text"
          placeholder="Search by restaurant, name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-2.5 bg-tastelanc-surface border border-tastelanc-surface-light rounded-full text-tastelanc-text-primary placeholder:text-tastelanc-text-faint focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-tastelanc-text-faint hover:text-tastelanc-text-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-4">
        {/* Type filters */}
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => updateParams({ type: f.value })}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                currentType === f.value
                  ? 'bg-blue-500/20 text-blue-400 font-medium'
                  : 'text-tastelanc-text-faint hover:text-tastelanc-text-muted hover:bg-tastelanc-surface-light/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-tastelanc-surface-light" />

        {/* Status filters */}
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => updateParams({ status: f.value })}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                currentStatus === f.value
                  ? 'bg-blue-500/20 text-blue-400 font-medium'
                  : 'text-tastelanc-text-faint hover:text-tastelanc-text-muted hover:bg-tastelanc-surface-light/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
