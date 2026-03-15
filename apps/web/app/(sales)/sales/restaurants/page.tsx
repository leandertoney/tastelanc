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
  Settings,
  User,
  Mail,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_title: string | null;
  address: string | null;
  zip_code: string | null;
  categories: string | null;
  market_id: string | null;
  business_email: string | null;
}

interface Stats {
  total: number;
  active: number;
  direct_contacts: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortColumn = 'name' | 'city' | 'is_active' | 'created_at';
type SortDir = 'asc' | 'desc';
export default function SalesRestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortColumn>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [contactFilter, setContactFilter] = useState(false);
  const [creatingLeadId, setCreatingLeadId] = useState<string | null>(null);
  const [marketFilter, setMarketFilter] = useState('all');
  const [markets, setMarkets] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const createLeadFromRestaurant = async (r: Restaurant) => {
    setCreatingLeadId(r.id);
    try {
      const res = await fetch('/api/sales/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: r.name,
          contact_name: r.contact_name || null,
          phone: r.phone || null,
          website: r.website || null,
          city: r.city || null,
          state: r.state || 'PA',
          address: r.address || null,
          zip_code: r.zip_code || null,
          category: Array.isArray(r.categories) ? r.categories[0] || 'restaurant' : r.categories || 'restaurant',
          email: r.contact_email || null,
          restaurant_id: r.id,
          contact_phone: r.contact_phone || undefined,
          contact_email: r.contact_email || undefined,
          contact_title: r.contact_title || undefined,
          market_id: r.market_id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');
      toast.success(`Lead created for ${r.name}`);
      router.push(`/sales/leads/${data.lead.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setCreatingLeadId(null);
    }
  };

  const fetchRestaurants = async (pageOverride?: number) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (marketFilter !== 'all') params.set('market', marketFilter);
      params.set('active', 'true');
      if (contactFilter) params.set('has_contact', 'true');
      params.set('page', String(pageOverride ?? pagination?.page ?? 1));
      params.set('limit', '10');
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);

      const res = await fetch(`/api/sales/restaurants?${params}`);
      const data = await res.json();
      setRestaurants(data.restaurants || []);
      setStats(data.stats || null);
      setPagination(data.pagination || null);
      if (data.isSuperAdmin) setIsSuperAdmin(data.isSuperAdmin);
      if (data.markets) setMarkets(data.markets);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants(1);
  }, [contactFilter, marketFilter, sortBy, sortDir]);

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
      className={`flex items-center gap-1 text-xs font-medium text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors uppercase tracking-wider ${className}`}
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
      default: return 'bg-tastelanc-surface-light text-tastelanc-text-muted';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary flex items-center gap-3">
          <Store className="w-8 h-8 text-tastelanc-accent" />
          Restaurant Directory
        </h1>
        <p className="text-tastelanc-text-muted mt-1">
          {stats ? `${stats.total} restaurants` : 'Browse and create leads from platform restaurants'}
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card className="p-3">
            <div className="text-xl font-bold text-tastelanc-text-primary">{stats.total}</div>
            <div className="text-xs text-tastelanc-text-muted">Total</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-green-400">{stats.active}</div>
            <div className="text-xs text-tastelanc-text-muted">Active</div>
          </Card>
          <Card className="p-3">
            <div className="text-xl font-bold text-emerald-400">{stats.direct_contacts}</div>
            <div className="text-xs text-tastelanc-text-muted">Direct Contacts</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-muted" />
            <input
              type="text"
              placeholder="Search by name or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>
          <div className="flex gap-3">
            {isSuperAdmin && markets.length > 1 && (
              <select
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="px-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              >
                <option value="all">All Markets</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setContactFilter((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                contactFilter
                  ? 'bg-emerald-600 text-white'
                  : 'bg-tastelanc-surface-light text-tastelanc-text-muted hover:text-tastelanc-text-primary'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Direct Contacts
            </button>
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
          <Store className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">No restaurants found</h3>
          <p className="text-tastelanc-text-muted">Try adjusting your search or filters</p>
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
                      <span className="text-xs font-medium text-tastelanc-text-muted uppercase tracking-wider">Contact</span>
                    </th>
                    <th className="text-left p-3">
                      <span className="text-xs font-medium text-tastelanc-text-muted uppercase tracking-wider">Tier</span>
                    </th>
                    <th className="text-left p-3">
                      <SortHeader column="is_active">Status</SortHeader>
                    </th>
                    <th className="text-right p-3">
                      <span className="text-xs font-medium text-tastelanc-text-muted uppercase tracking-wider">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {restaurants.map((r) => (
                    <tr key={r.id} className="border-b border-tastelanc-surface-light/50 hover:bg-tastelanc-surface-light/30 transition-colors">
                      <td className="p-3">
                        <span className="font-medium text-tastelanc-text-primary truncate block">{r.name}</span>
                      </td>
                      <td className="p-3">
                        {r.city ? (
                          <span className="text-sm text-tastelanc-text-muted flex items-center gap-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{r.city}</span>
                          </span>
                        ) : (
                          <span className="text-sm text-tastelanc-text-faint">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {r.phone && (
                              <a href={`tel:${r.phone}`} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors" title={r.phone}>
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {r.website && (
                              <a
                                href={r.website.startsWith('http') ? r.website : `https://${r.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors"
                                title="Website"
                              >
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {r.business_email && (
                              <a href={`mailto:${r.business_email}`} className="text-blue-400 hover:text-blue-300 transition-colors" title={r.business_email}>
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {!r.phone && !r.website && !r.contact_name && !r.business_email && <span className="text-sm text-tastelanc-text-faint">—</span>}
                          </div>
                          {r.contact_name && (
                            <div className="flex items-center gap-1" title={`${r.contact_name}${r.contact_title ? ` — ${r.contact_title}` : ''}${r.contact_phone ? ` | ${r.contact_phone}` : ''}`}>
                              <User className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                              <span className="text-xs text-emerald-400 truncate">{r.contact_name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {r.tiers ? (
                          <Badge className={`text-xs ${tierBadgeClass(r.tiers.name)}`}>
                            {r.tiers.name}
                          </Badge>
                        ) : (
                          <span className="text-sm text-tastelanc-text-faint">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-xs ${r.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/profile?sales_mode=true&restaurant_id=${r.id}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5" />
                            Manage
                          </Link>
                          {r.has_lead ? (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Lead exists
                            </span>
                          ) : (
                            <button
                              onClick={() => createLeadFromRestaurant(r)}
                              disabled={creatingLeadId === r.id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                            >
                              {creatingLeadId === r.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="w-3.5 h-3.5" />
                              )}
                              Create Lead
                            </button>
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
              <span className="text-sm text-tastelanc-text-muted">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                      <span key={`e${i}`} className="px-2 text-tastelanc-text-faint">...</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item as number)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          pagination.page === item
                            ? 'bg-tastelanc-accent text-white'
                            : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
