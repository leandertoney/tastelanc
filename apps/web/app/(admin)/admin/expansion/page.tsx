'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Search,
  Palette,
  Rocket,
  Plus,
  Sparkles,
  Loader2,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
  Briefcase,
  Play,
  Bot,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import ExpansionPipelineCard from '@/components/admin/expansion/ExpansionPipelineCard';
import AddCityModal from '@/components/admin/expansion/AddCityModal';
import AISuggestModal from '@/components/admin/expansion/AISuggestModal';
import type { ExpansionCity, ExpansionStats, ActivityLogEntry, ExpansionReview } from '@/lib/ai/expansion-types';

const ACTION_LABELS: Record<string, string> = {
  city_added: 'City Added',
  research_started: 'Research Started',
  research_completed: 'Research Completed',
  brand_generated: 'Brand Generated',
  brand_selected: 'Brand Selected',
  brand_regenerated: 'Brand Regenerated',
  job_listing_generated: 'Job Listing Generated',
  job_listing_approved: 'Job Listing Approved',
  job_listing_rejected: 'Job Listing Rejected',
  city_approved: 'City Approved',
  city_rejected: 'City Rejected',
  city_put_on_hold: 'City Put On Hold',
  market_created: 'Market Created',
  status_changed: 'Status Changed',
  note_added: 'Note Added',
};

const STATUS_ORDER: Record<string, number> = {
  brand_ready: 0,
  approved: 1,
  researched: 2,
  researching: 3,
  setup_in_progress: 4,
  live: 5,
  on_hold: 6,
  rejected: 7,
};

interface PendingReview {
  brandsToReview: ExpansionCity[];
  jobsToApprove: ExpansionCity[];
  citiesToApprove: ExpansionCity[];
}

export default function ExpansionPipelinePage() {
  const [cities, setCities] = useState<ExpansionCity[]>([]);
  const [stats, setStats] = useState<ExpansionStats | null>(null);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviews, setReviews] = useState<Record<string, ExpansionReview[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [pendingReview, setPendingReview] = useState<PendingReview>({
    brandsToReview: [],
    jobsToApprove: [],
    citiesToApprove: [],
  });

  const fetchData = async () => {
    try {
      const [statsRes, citiesRes, activityRes, reviewsRes] = await Promise.all([
        fetch('/api/admin/expansion/stats'),
        fetch('/api/admin/expansion/cities'),
        fetch('/api/admin/expansion/activity?limit=15'),
        fetch('/api/admin/expansion/reviews'),
      ]);

      const [statsData, citiesData, activityData, reviewsData] = await Promise.all([
        statsRes.json(),
        citiesRes.json(),
        activityRes.json(),
        reviewsRes.json(),
      ]);

      if (statsRes.ok) setStats(statsData);
      if (activityRes.ok) setActivities(activityData.activities || []);

      // Group reviews by city_id
      if (reviewsRes.ok && reviewsData.reviews) {
        const grouped: Record<string, ExpansionReview[]> = {};
        for (const r of reviewsData.reviews as ExpansionReview[]) {
          if (!grouped[r.city_id]) grouped[r.city_id] = [];
          grouped[r.city_id].push(r);
        }
        setReviews(grouped);
      }

      if (citiesRes.ok) {
        const allCities: ExpansionCity[] = citiesData.cities || [];
        setCities(allCities);
        computePendingReview(allCities);
      }
    } catch (error) {
      console.error('Error fetching expansion data:', error);
      toast.error('Failed to load expansion data');
    } finally {
      setIsLoading(false);
    }
  };

  // Determine which cities need admin attention
  const computePendingReview = async (allCities: ExpansionCity[]) => {
    const brandReady = allCities.filter((c) => c.status === 'brand_ready');

    // For brand_ready cities, check which ones still need brand selection
    const brandsToReview: ExpansionCity[] = [];
    const citiesToApprove: ExpansionCity[] = [];

    for (const city of brandReady) {
      try {
        const res = await fetch(`/api/admin/expansion/cities/${city.id}/brands`);
        if (res.ok) {
          const { brands } = await res.json();
          const hasSelected = brands.some((b: { is_selected: boolean }) => b.is_selected);
          if (!hasSelected) {
            brandsToReview.push(city);
          } else {
            citiesToApprove.push(city);
          }
        }
      } catch {
        // Skip — will show in general list
      }
    }

    // Cities with draft job listings
    const jobsToApprove = allCities.filter(
      (c) => c.status === 'brand_ready' || c.status === 'approved'
    );

    setPendingReview({ brandsToReview, jobsToApprove, citiesToApprove });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCityAdded = (city: ExpansionCity) => {
    setCities((prev) => [city, ...prev]);
    setStats((prev) =>
      prev
        ? { ...prev, total: prev.total + 1, researching: prev.researching + 1 }
        : null
    );
  };

  const handleRunAgent = async () => {
    setIsRunningAgent(true);
    try {
      const res = await fetch('/api/cron/expansion-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'manual_trigger' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Agent run failed');
      }

      const result = await res.json();
      toast.success(
        `Agent completed: ${result.citiesSuggested || 0} suggested, ${result.citiesResearched?.length || 0} researched, ${result.brandsGenerated?.length || 0} branded`
      );

      // Refresh data
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to run agent');
    } finally {
      setIsRunningAgent(false);
    }
  };

  // Sort cities: items needing attention first, then by status order
  const sortedCities = [...cities].sort((a, b) => {
    const aOrder = STATUS_ORDER[a.status] ?? 99;
    const bOrder = STATUS_ORDER[b.status] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.market_potential_score ?? 0) - (a.market_potential_score ?? 0);
  });

  const filteredCities = sortedCities.filter((city) =>
    city.city_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Compute "needs attention" count
  const attentionCount =
    pendingReview.brandsToReview.length +
    pendingReview.citiesToApprove.length;

  const statCards = [
    {
      label: 'Total Pipeline',
      value: stats?.total ?? 0,
      icon: Globe,
      colorClass: 'text-white',
      bgClass: 'bg-white/10',
    },
    {
      label: 'Researched',
      value: stats?.researched ?? 0,
      icon: Search,
      colorClass: 'text-purple-400',
      bgClass: 'bg-purple-500/20',
    },
    {
      label: 'Brand Ready',
      value: stats?.brand_ready ?? 0,
      icon: Palette,
      colorClass: 'text-yellow-400',
      bgClass: 'bg-yellow-500/20',
    },
    {
      label: 'Live',
      value: stats?.live ?? 0,
      icon: Rocket,
      colorClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/20',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Globe className="w-8 h-8 text-tastelanc-accent" />
            City Expansion
          </h1>
          <p className="text-gray-400 mt-1">
            Autonomous agent runs every 6 hours — review and approve below
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRunAgent}
            disabled={isRunningAgent}
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg transition-colors text-sm font-medium text-gray-300 disabled:opacity-50"
          >
            {isRunningAgent ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunningAgent ? 'Running...' : 'Run Agent Now'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg transition-colors text-sm font-medium text-gray-300"
          >
            <Plus className="w-4 h-4" />
            Add City
          </button>
        </div>
      </div>

      {/* Agent Status Bar */}
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">Expansion Agent Active</p>
          <p className="text-xs text-gray-500">
            Runs every 6 hours — auto-suggests cities, researches markets, generates brands & job listings
          </p>
        </div>
        {attentionCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            {attentionCount} need{attentionCount === 1 ? 's' : ''} review
          </div>
        )}
      </div>

      {/* Needs Your Attention Section */}
      {(pendingReview.brandsToReview.length > 0 || pendingReview.citiesToApprove.length > 0) && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Needs Your Attention
          </h2>
          <div className="space-y-2">
            {pendingReview.brandsToReview.map((city) => (
              <Link
                key={`brand-${city.id}`}
                href={`/admin/expansion/${city.id}`}
                className="flex items-center gap-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 hover:bg-amber-500/15 transition-colors group"
              >
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Palette className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    Select a brand for {city.city_name}, {city.state}
                  </p>
                  <p className="text-xs text-gray-500">
                    3 brand proposals generated — pick your favorite
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-amber-400 transition-colors" />
              </Link>
            ))}
            {pendingReview.citiesToApprove.map((city) => (
              <Link
                key={`approve-${city.id}`}
                href={`/admin/expansion/${city.id}`}
                className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 hover:bg-emerald-500/15 transition-colors group"
              >
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {city.city_name}, {city.state} is ready for launch approval
                  </p>
                  <p className="text-xs text-gray-500">
                    Brand selected — review and approve for launch
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-emerald-400 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${stat.bgClass} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.colorClass}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="flex gap-3 mb-6">
        <Link
          href="/admin/expansion/jobs"
          className="flex items-center gap-2 px-4 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-sm text-gray-300 hover:text-white hover:border-tastelanc-accent/50 transition-colors"
        >
          <Briefcase className="w-4 h-4" />
          All Job Listings
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search cities by name, county, or state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface border border-tastelanc-surface-light rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
          />
        </div>
      </div>

      {/* City List */}
      {filteredCities.length === 0 ? (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-12 text-center">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {searchQuery
              ? 'No cities match your search'
              : 'Agent is building your pipeline'}
          </h3>
          <p className="text-gray-400 mb-4">
            {searchQuery
              ? 'Try a different search term'
              : 'The expansion agent will auto-suggest and research cities. You can also manually trigger it or add a city.'}
          </p>
          {!searchQuery && (
            <div className="flex justify-center gap-3">
              <button
                onClick={handleRunAgent}
                disabled={isRunningAgent}
                className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isRunningAgent ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run Agent Now
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg transition-colors text-sm font-medium text-gray-300"
              >
                <Plus className="w-4 h-4" />
                Add City Manually
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {filteredCities.map((city) => (
            <ExpansionPipelineCard key={city.id} city={city} reviews={reviews[city.id]} />
          ))}
        </div>
      )}

      {/* Recent Activity */}
      {activities.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Agent Activity Log
          </h2>
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light divide-y divide-tastelanc-surface-light">
            {activities.map((activity) => {
              const isAutomatic = activity.metadata && (activity.metadata as Record<string, unknown>).source === 'autonomous_agent';
              return (
                <div key={activity.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isAutomatic ? 'bg-emerald-400' : 'bg-tastelanc-accent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      {isAutomatic && (
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded mr-2">
                          Agent
                        </span>
                      )}
                      <span className="font-medium text-tastelanc-accent">
                        {ACTION_LABELS[activity.action] || activity.action}
                      </span>
                      {activity.description && (
                        <span className="text-gray-400"> — {activity.description}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {formatTimeAgo(activity.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals — keep for manual overrides */}
      <AddCityModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCityAdded={handleCityAdded}
      />

      <AISuggestModal
        isOpen={showSuggestModal}
        onClose={() => setShowSuggestModal(false)}
        onCityAdded={handleCityAdded}
      />
    </div>
  );
}
