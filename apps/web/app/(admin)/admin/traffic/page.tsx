'use client';

import { useState, useEffect, useCallback } from 'react';
import { Globe, Users, Eye, MousePointer, ArrowDownUp } from 'lucide-react';
import TrafficKPICard from '@/components/admin/traffic/TrafficKPICard';
import VisitorTrendChart from '@/components/admin/traffic/VisitorTrendChart';
import TrafficSourcesChart from '@/components/admin/traffic/TrafficSourcesChart';
import DeviceBreakdownChart from '@/components/admin/traffic/DeviceBreakdownChart';
import TopPagesTable from '@/components/admin/traffic/TopPagesTable';
import TopLandingPagesTable from '@/components/admin/traffic/TopLandingPagesTable';
import TopReferrersTable from '@/components/admin/traffic/TopReferrersTable';
import BrowserChart from '@/components/admin/traffic/BrowserChart';
import PeriodSelector from '@/components/admin/traffic/PeriodSelector';

type Period = 'today' | '7d' | '30d' | 'all';

interface TrafficData {
  activeNow: number;
  uniqueVisitors: number;
  totalViews: number;
  totalClicks: number;
  bounceRate: number;
  prevPeriodVisitors: number;
  prevPeriodViews: number;
  sources: { source: string; count: number; percentage: number }[];
  dailyTrend: { date: string; views: number; visitors: number }[];
  topPages: { path: string; views: number; uniqueVisitors: number }[];
  topLandingPages: { path: string; landings: number }[];
  devices: { type: string; count: number; percentage: number }[];
  browsers: { name: string; count: number; percentage: number }[];
  topReferrers: { domain: string; count: number }[];
}

function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function TrafficDashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<TrafficData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/traffic-analytics?period=${period}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  // Auto-refresh: full data every 60s when viewing "today"
  useEffect(() => {
    if (period !== 'today') return;
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [period, fetchData]);

  // Active now polling every 30s (lightweight — reuses full fetch for simplicity)
  useEffect(() => {
    if (period === 'today') return; // already auto-refreshing
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/traffic-analytics?period=${period}`);
        if (res.ok) {
          const json = await res.json();
          setData(prev => prev ? { ...prev, activeNow: json.activeNow } : json);
        }
      } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [period]);

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 font-medium">Failed to load traffic analytics</p>
          <p className="text-red-400/70 text-sm mt-1">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const visitorDelta = data ? computeDelta(data.uniqueVisitors, data.prevPeriodVisitors) : null;
  const viewsDelta = data ? computeDelta(data.totalViews, data.prevPeriodViews) : null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-tastelanc-text-primary flex items-center gap-2">
            <Globe className="w-6 h-6 text-tastelanc-accent" />
            Web Traffic
          </h1>
          <p className="text-sm text-tastelanc-text-muted mt-1">
            Website performance and visitor analytics
          </p>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-tastelanc-card rounded-xl p-5 h-28 animate-pulse" />
            ))}
          </div>
          <div className="bg-tastelanc-card rounded-xl p-6 h-80 animate-pulse" />
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <TrafficKPICard
              label="Active Now"
              value={data.activeNow}
              icon={<Users className="w-5 h-5" />}
              pulse
            />
            <TrafficKPICard
              label="Unique Visitors"
              value={data.uniqueVisitors}
              icon={<Eye className="w-5 h-5" />}
              delta={visitorDelta}
            />
            <TrafficKPICard
              label="Page Views"
              value={data.totalViews}
              icon={<MousePointer className="w-5 h-5" />}
              delta={viewsDelta}
            />
            <TrafficKPICard
              label="Bounce Rate"
              value={`${data.bounceRate}%`}
              icon={<ArrowDownUp className="w-5 h-5" />}
            />
          </div>

          {/* Visitor Trend Chart */}
          <VisitorTrendChart data={data.dailyTrend} />

          {/* Traffic Sources + Devices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TrafficSourcesChart data={data.sources} />
            <DeviceBreakdownChart data={data.devices} />
          </div>

          {/* Top Pages + Top Landing Pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopPagesTable data={data.topPages} />
            <TopLandingPagesTable data={data.topLandingPages} />
          </div>

          {/* Referrers + Browsers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopReferrersTable data={data.topReferrers} />
            <BrowserChart data={data.browsers} />
          </div>
        </>
      )}
    </div>
  );
}
