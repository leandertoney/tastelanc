'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Briefcase,
  Plus,
  Clock,
  Loader2,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface Stats {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  notInterested: number;
  converted: number;
}

interface Lead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
}

interface Activity {
  id: string;
  lead_id: string;
  activity_type: string;
  description: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-400' },
  contacted: { label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400' },
  interested: { label: 'Interested', color: 'bg-green-500/20 text-green-400' },
  not_interested: { label: 'Not Interested', color: 'bg-red-500/20 text-red-400' },
  converted: { label: 'Converted', color: 'bg-lancaster-gold/20 text-lancaster-gold' },
};

const AUTO_REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

export default function SalesDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setFetchError(false);

    try {
      const res = await fetch('/api/sales/leads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setStats(data.stats || null);

      const leads: Lead[] = data.leads || [];
      setRecentLeads(leads.slice(0, 5));

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const needsFollowUp = leads.filter(
        (l) =>
          ['contacted', 'interested', 'new'].includes(l.status) &&
          (!l.last_contacted_at || l.last_contacted_at < threeDaysAgo)
      );
      setFollowUpLeads(needsFollowUp.slice(0, 5));
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (!silent) setFetchError(true);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  if (fetchError && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load sales data</h2>
          <p className="text-gray-400 text-sm mb-6">
            We had trouble fetching the sales dashboard. Please check your connection and try again.
          </p>
          <button
            onClick={() => fetchData()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-tastelanc-accent" />
            Sales Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Track your pipeline and outreach</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-tastelanc-surface-light transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/sales/leads/new"
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        </div>
      </div>

      {/* Pipeline Funnel */}
      {stats && stats.total > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Conversion Pipeline</h2>
          <div className="flex items-stretch gap-1">
            {[
              { label: 'New', count: stats.new, color: 'bg-blue-500', textColor: 'text-blue-400' },
              { label: 'Contacted', count: stats.contacted, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
              { label: 'Interested', count: stats.interested, color: 'bg-green-500', textColor: 'text-green-400' },
              { label: 'Converted', count: stats.converted, color: 'bg-lancaster-gold', textColor: 'text-lancaster-gold' },
            ].map((stage, i, arr) => {
              const pct = stats.total > 0 ? Math.max((stage.count / stats.total) * 100, 8) : 25;
              const conversionFromPrev = i > 0 && arr[i - 1].count > 0
                ? Math.round((stage.count / arr[i - 1].count) * 100)
                : null;
              return (
                <div key={stage.label} className="flex-1 min-w-0">
                  <div className="text-center mb-2">
                    <span className={`text-2xl font-bold ${stage.textColor}`}>{stage.count}</span>
                    <p className="text-xs text-gray-500">{stage.label}</p>
                  </div>
                  <div className="h-3 rounded-full bg-tastelanc-surface overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {conversionFromPrev !== null && (
                    <p className="text-xs text-gray-500 text-center mt-1">{conversionFromPrev}%</p>
                  )}
                </div>
              );
            })}
          </div>
          {stats.notInterested > 0 && (
            <div className="mt-4 pt-3 border-t border-tastelanc-surface-light flex items-center justify-between">
              <span className="text-xs text-gray-500">Not Interested</span>
              <span className="text-sm font-medium text-red-400">{stats.notInterested}</span>
            </div>
          )}
          {stats.total > 0 && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500">Overall conversion rate</span>
              <span className="text-sm font-medium text-lancaster-gold">
                {Math.round((stats.converted / stats.total) * 100)}%
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Pipeline Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-sm text-gray-400">Total Leads</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.new}</div>
            <div className="text-sm text-gray-400">New</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.contacted}</div>
            <div className="text-sm text-gray-400">Contacted</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-400">{stats.interested}</div>
            <div className="text-sm text-gray-400">Interested</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-400">{stats.notInterested}</div>
            <div className="text-sm text-gray-400">Not Interested</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-lancaster-gold">{stats.converted}</div>
            <div className="text-sm text-gray-400">Converted</div>
          </Card>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Needs Follow-Up */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Needs Follow-Up
            </h2>
            <Link href="/sales/leads?status=contacted" className="text-sm text-tastelanc-accent hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {followUpLeads.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">All caught up!</p>
          ) : (
            <div className="space-y-3">
              {followUpLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/sales/leads/${lead.id}`}
                  className="block p-3 bg-tastelanc-surface-light rounded-lg hover:bg-tastelanc-surface-light/80 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium truncate">{lead.business_name}</span>
                    <Badge className={STATUS_CONFIG[lead.status]?.color || ''}>
                      {STATUS_CONFIG[lead.status]?.label || lead.status}
                    </Badge>
                  </div>
                  <p className="text-gray-500 text-xs">
                    {lead.last_contacted_at
                      ? `Last contact: ${new Date(lead.last_contacted_at).toLocaleDateString()}`
                      : 'Never contacted'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Leads */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-tastelanc-accent" />
              Recent Leads
            </h2>
            <Link href="/sales/leads" className="text-sm text-tastelanc-accent hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No leads yet</p>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/sales/leads/${lead.id}`}
                  className="block p-3 bg-tastelanc-surface-light rounded-lg hover:bg-tastelanc-surface-light/80 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium truncate">{lead.business_name}</span>
                    <Badge className={STATUS_CONFIG[lead.status]?.color || ''}>
                      {STATUS_CONFIG[lead.status]?.label || lead.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {lead.contact_name && <span>{lead.contact_name}</span>}
                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
