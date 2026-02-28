'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Store,
  Search,
  Loader2,
  Globe,
  Phone,
  MapPin,
  UserPlus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { toast } from 'sonner';

interface Restaurant {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  is_active: boolean;
  tiers: { name: string } | null;
  has_lead: boolean;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  elite: number;
  premium: number;
  standard: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortColumn = 'name' | 'city' | 'is_active' | 'created_at';
type SortDir = 'asc' | 'desc';
type TierFilter = 'all' | 'elite' | 'premium' | 'standard';
type ActiveFilter = 'all' | 'active' | 'inactive';

export default function SalesRestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [sortBy, setSortBy] = useState<SortColumn>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const fetchRestaurants = async (pageOverride?: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (tierFilter !== 'all') params.set('tier', tierFilter);
      if (activeFilter !== 'all') params.set('active', activeFilter === 'active' ? 'true' : 'false');
      params.set('page', String(pageOverride ?? pagination?.page ?? 1));
      params.set('limit', '25');
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);

      const res = await fetch(`/api/sales/restaurants?${params}`);
      const data = await res.json();
      setRestaurants(data.restaurants || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants(1);
  }, [tierFilter, activeFilter, sortBy, sortDir]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchRestaurants(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const goToPage = (p: number) => {
    if (!pagination || p < 1 || p > pagination.totalPages) return;
    fetchRestaurants(p);
  };

  const SortHeader = ({ column, children, className = '' }: { column: SortColumn; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => handleSort(column)}
      className={`flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors uppercase tracking-wider ${className}`}
    >
      {children}
      {sortBy === column ? (
        sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );

  const tierBadgeClass = (tierName: string) => {
    switch (tierName) {
      case 'elite': return 'bg-lancaster-gold/20 text-lancaster-gold';
      case 'premium': return 'bg-tastelanc-accent/20 text-tastelanc-accent';
      default: return 'bg-tastelanc-surface-light text-gray-400';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
          <Store className="w-8 h-8 text-tastelanc-accent" />
          Restaurant Directory
        </h1>
        <p className="text-gray-400 mt-1">
          {stats ? `${stats.total} restaurants` : 'Browse and create leads from platform restaurants'}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
          <Card className="p-3">
            <div className="text-xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-green-400">{stats.active}</div>
            <div className="text-xs text-gray-400">Active</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-red-400">{stats.inactive}</div>
            <div className="text-xs text-gray-400">Inactive</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-lancaster-gold">{stats.elite}</div>
            <div className="text-xs text-gray-400">Elite</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-tastelanc-accent">{stats.premium}</div>
            <div className="text-xs text-gray-400">Premium</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-gray-400">{stats.standard}</div>
            <div className="text-xs text-gray-400">Standard</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>
          <div className="flex gap-2">
            {([
              { value: 'all' as const, label: 'All Tiers' },
              { value: 'elite' as const, label: 'Elite' },
              { value: 'premium' as const, label: 'Premium' },
              { value: 'standard' as const, label: 'Standard' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTierFilter(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tierFilter === opt.value
                    ? 'bg-tastelanc-accent text-white'
                    : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {([
              { value: 'all' as const, label: 'All' },
              { value: 'active' as const, label: 'Active' },
              { value: 'inactive' as const, label: 'Inactive' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setActiveFilter(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === opt.value
                    ? 'bg-tastelanc-accent text-white'
                    : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Restaurant Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
        </div>
      ) : restaurants.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No restaurants found</h3>
          <p className="text-gray-400">Try adjusting your search or filters</p>
        </Card>
      ) : (
        <>
          {/* Table */}
          <Card className="overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-tastelanc-surface-light">
                    <th className="text-left p-3">
                      <SortHeader column="name">Name</SortHeader>
                    </th>
                    <th className="text-left p-3">
                      <SortHeader column="city">City</SortHeader>
                    </th>
                    <th className="text-left p-3">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</span>
                    </th>
                    <th className="text-left p-3">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Tier</span>
                    </th>
                    <th className="text-left p-3">
                      <SortHeader column="is_active">Status</SortHeader>
                    </th>
                    <th className="text-right p-3">
                      <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((r) => (
                    <tr key={r.id} className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30 transition-colors">
                      <td className="p-3">
                        <span className="font-medium text-white truncate block">{r.name}</span>
                      </td>
                      <td className="p-3">
                        {r.city ? (
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{r.city}</span>
                          </span>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {r.phone && (
                            <a href={`tel:${r.phone}`} className="text-gray-400 hover:text-white transition-colors" title={r.phone}>
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {r.website && (
                            <a
                              href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-white transition-colors"
                              title="Website"
                            >
                              <Globe className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {!r.phone && !r.website && <span className="text-sm text-gray-600">—</span>}
                        </div>
                      </td>
                      <td className="p-3">
                        {r.tiers ? (
                          <Badge className={`text-xs ${tierBadgeClass(r.tiers.name)}`}>
                            {r.tiers.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-xs ${r.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          {r.has_lead ? (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Lead exists
                            </span>
                          ) : (
                            <Link
                              href={`/sales/leads/new?restaurant_id=${r.id}&name=${encodeURIComponent(r.name)}&phone=${encodeURIComponent(r.phone || '')}&website=${encodeURIComponent(r.website || '')}&city=${encodeURIComponent(r.city || '')}&state=${encodeURIComponent(r.state || '')}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white text-sm rounded-lg transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Create Lead
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-tastelanc-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                  .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === 'ellipsis' ? (
                      <span key={`e${i}`} className="px-2 text-gray-600">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          pagination.page === item
                            ? 'bg-tastelanc-accent text-white'
                            : 'text-gray-400 hover:text-white hover:bg-tastelanc-surface-light'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-tastelanc-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
