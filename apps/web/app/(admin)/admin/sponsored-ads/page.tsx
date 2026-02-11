'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  Users,
  MousePointerClick,
  TrendingUp,
  RefreshCw,
  Clock,
  ChevronUp,
  ChevronDown,
  Megaphone,
  ExternalLink,
} from 'lucide-react';

interface FeaturedAd {
  id: string;
  business_name: string;
  image_url: string;
  click_url: string;
  tagline: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
}

interface AdPerformanceEntry {
  impressions: number;
  unique_impressions: number;
  clicks: number;
  daily: Array<{ date: string; impressions: number }>;
}

interface SponsoredAdsData {
  ads: FeaturedAd[];
  adPerformance: Record<string, AdPerformanceEntry>;
  totals: {
    impressions: number;
    uniqueImpressions: number;
    clicks: number;
    ctr: number;
  };
}

type DateRange = '7d' | '30d' | 'all';

function getAdStatus(ad: FeaturedAd): { label: string; className: string } {
  const today = new Date().toISOString().split('T')[0];
  if (!ad.is_active) return { label: 'Inactive', className: 'bg-gray-500/20 text-gray-400' };
  if (ad.start_date && ad.start_date > today) return { label: 'Scheduled', className: 'bg-blue-500/20 text-blue-400' };
  if (ad.end_date && ad.end_date < today) return { label: 'Expired', className: 'bg-yellow-500/20 text-yellow-400' };
  return { label: 'Active', className: 'bg-green-500/20 text-green-400' };
}

function Sparkline({ daily }: { daily: Array<{ date: string; impressions: number }> }) {
  if (!daily || daily.length === 0) {
    return <span className="text-gray-600 text-xs">No data</span>;
  }
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  const maxVal = Math.max(...sorted.map((d) => d.impressions), 1);
  return (
    <div className="flex items-end gap-0.5 h-6" title="Last 7 days impressions">
      {sorted.slice(-7).map((d, i) => (
        <div
          key={i}
          className="w-1.5 bg-tastelanc-accent rounded-sm min-h-[2px]"
          style={{ height: `${Math.max(2, (d.impressions / maxVal) * 24)}px` }}
          title={`${d.date}: ${d.impressions}`}
        />
      ))}
    </div>
  );
}

export default function SponsoredAdsPage() {
  const [data, setData] = useState<SponsoredAdsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState<DateRange>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async (dateRange: DateRange = range) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/sponsored-ads?range=${dateRange}`);
      const result = await res.json();
      setData(result);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching sponsored ads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRangeChange = (newRange: DateRange) => {
    setRange(newRange);
    fetchData(newRange);
  };

  const handleToggleActive = async (adId: string, newValue: boolean) => {
    try {
      const res = await fetch(`/api/admin/sponsored-ads/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newValue }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                ads: prev.ads.map((a) => (a.id === adId ? { ...a, is_active: newValue } : a)),
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to toggle ad:', err);
    }
  };

  const handlePriorityChange = async (adId: string, newPriority: number) => {
    try {
      const res = await fetch(`/api/admin/sponsored-ads/${adId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                ads: prev.ads.map((a) => (a.id === adId ? { ...a, priority: newPriority } : a)),
              }
            : null
        );
      }
    } catch (err) {
      console.error('Failed to update priority:', err);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Impressions',
      value: data?.totals.impressions.toLocaleString() || '0',
      icon: Eye,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Unique Impressions',
      value: data?.totals.uniqueImpressions.toLocaleString() || '0',
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
    {
      label: 'Total Clicks',
      value: data?.totals.clicks.toLocaleString() || '0',
      icon: MousePointerClick,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      label: 'Overall CTR',
      value: `${data?.totals.ctr || 0}%`,
      icon: TrendingUp,
      color: 'text-lancaster-gold',
      bgColor: 'bg-lancaster-gold/10',
    },
  ];

  const rangeLabel = range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'All time';

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-lancaster-gold" />
            Sponsored Ads
          </h1>
          <p className="text-gray-400 text-xs md:text-sm mt-1">
            Track impressions, clicks, and manage ad placements
          </p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-tastelanc-surface hover:bg-tastelanc-surface-light rounded-lg text-gray-300 transition-colors text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Last Updated */}
      <div className="flex items-center gap-2 text-xs md:text-sm text-gray-500 mb-4 md:mb-6">
        <Clock className="w-4 h-4" />
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>

      {/* Date Range Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: '7d' as const, label: '7 Days' },
          { key: '30d' as const, label: '30 Days' },
          { key: 'all' as const, label: 'All Time' },
        ]).map((r) => (
          <button
            key={r.key}
            onClick={() => handleRangeChange(r.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              range === r.key
                ? 'bg-tastelanc-accent text-white'
                : 'bg-tastelanc-surface text-gray-400 hover:bg-tastelanc-surface-light hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-tastelanc-surface rounded-lg p-4 md:p-6">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className={`w-8 h-8 md:w-10 md:h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
              </div>
              <span className="text-gray-500 text-xs">{rangeLabel}</span>
            </div>
            <p className="text-xl md:text-3xl font-bold text-white">{stat.value}</p>
            <p className="text-xs md:text-sm text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Per-Ad Performance */}
      <div className="bg-tastelanc-surface rounded-lg overflow-hidden">
        <div className="p-4 md:p-6 border-b border-tastelanc-surface-light">
          <h3 className="text-base md:text-lg font-semibold text-white">Ad Performance</h3>
        </div>

        {!data?.ads || data.ads.length === 0 ? (
          <div className="py-12 text-center">
            <Megaphone className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500">No sponsored ads yet</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-tastelanc-surface-light">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Ad</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Impressions</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Unique</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">Clicks</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">CTR</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Trend (7d)</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Priority</th>
                    <th className="text-center px-4 py-3 text-gray-400 font-medium">Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tastelanc-surface-light">
                  {data.ads.map((ad) => {
                    const perf = data.adPerformance[ad.id];
                    const impressions = perf?.impressions || 0;
                    const unique = perf?.unique_impressions || 0;
                    const clicks = perf?.clicks || 0;
                    const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
                    const status = getAdStatus(ad);

                    return (
                      <tr key={ad.id} className="hover:bg-tastelanc-surface-light/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <a href={ad.image_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={ad.image_url}
                                alt={ad.business_name}
                                className="w-10 h-10 rounded object-cover bg-tastelanc-surface-light"
                              />
                            </a>
                            <div>
                              <p className="text-white font-medium">{ad.business_name}</p>
                              <a
                                href={ad.click_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-tastelanc-accent flex items-center gap-1"
                              >
                                {new URL(ad.click_url).hostname}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">{impressions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{unique.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{clicks.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-gray-400">{ctr}%</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <Sparkline daily={perf?.daily || []} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <span className="text-white font-medium w-6 text-center">{ad.priority}</span>
                            <div className="flex flex-col">
                              <button
                                onClick={() => handlePriorityChange(ad.id, ad.priority + 1)}
                                className="text-gray-500 hover:text-white transition-colors"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handlePriorityChange(ad.id, Math.max(0, ad.priority - 1))}
                                className="text-gray-500 hover:text-white transition-colors"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleToggleActive(ad.id, !ad.is_active)}
                              className={`w-10 h-5 rounded-full transition-colors relative ${
                                ad.is_active ? 'bg-green-500' : 'bg-gray-600'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                                  ad.is_active ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-tastelanc-surface-light">
              {data.ads.map((ad) => {
                const perf = data.adPerformance[ad.id];
                const impressions = perf?.impressions || 0;
                const unique = perf?.unique_impressions || 0;
                const clicks = perf?.clicks || 0;
                const ctr = impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : 0;
                const status = getAdStatus(ad);

                return (
                  <div key={ad.id} className="p-4">
                    {/* Ad header */}
                    <div className="flex items-center gap-3 mb-3">
                      <a href={ad.image_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={ad.image_url}
                          alt={ad.business_name}
                          className="w-12 h-12 rounded object-cover bg-tastelanc-surface-light"
                        />
                      </a>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{ad.business_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                            {status.label}
                          </span>
                          <span className="text-xs text-gray-500">P{ad.priority}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(ad.id, !ad.is_active)}
                        className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                          ad.is_active ? 'bg-green-500' : 'bg-gray-600'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                            ad.is_active ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-white font-medium text-sm">{impressions.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">Imps</p>
                      </div>
                      <div>
                        <p className="text-gray-300 text-sm">{unique.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">Unique</p>
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{clicks.toLocaleString()}</p>
                        <p className="text-gray-500 text-xs">Clicks</p>
                      </div>
                      <div>
                        <p className="text-gray-300 text-sm">{ctr}%</p>
                        <p className="text-gray-500 text-xs">CTR</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
