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
  X,
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
  const [agentStatus, setAgentStatus] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [votingCityId, setVotingCityId] = useState<string | null>(null);
  const [showVoteQueue, setShowVoteQueue] = useState(false);
  const isSuperAdmin = userRole === 'super_admin';
  const canManage = userRole === 'super_admin' || userRole === 'co_founder';
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

      if (statsRes.ok) {
        setStats(statsData);
        if (statsData.role) setUserRole(statsData.role);
        if (statsData.userEmail) setUserEmail(statsData.userEmail);
      }
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
    setAgentStatus(null);

    const steps = ['suggest', 'research', 'brands', 'jobs', 'notify'] as const;
    const stepLabels: Record<string, string> = {
      suggest: 'Suggesting new cities',
      research: 'Researching',
      brands: 'Generating brands for',
      jobs: 'Creating job listings',
      notify: 'Sending notifications',
    };

    const totalResult = { citiesSuggested: 0, citiesResearched: [] as string[], brandsGenerated: [] as string[], errors: [] as string[] };

    const runStep = async (step: string) => {
      const res = await fetch('/api/cron/expansion-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'manual_trigger', step }),
      });

      if (!res.ok) {
        // Try to parse error, but handle non-JSON responses (like 504 HTML)
        let errorMsg = `Step "${step}" failed (${res.status})`;
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      return res.json();
    };

    try {
      for (const step of steps) {
        // For research and brands, loop one city at a time until done
        if (step === 'research' || step === 'brands') {
          let hasMore = true;
          while (hasMore) {
            setAgentStatus(`${stepLabels[step]}...`);
            try {
              const result = await runStep(step);

              // Update status with city name if available
              if (result.currentCity) {
                setAgentStatus(`${stepLabels[step]} ${result.currentCity}...`);
              }

              if (result.citiesResearched?.length) totalResult.citiesResearched.push(...result.citiesResearched);
              if (result.brandsGenerated?.length) totalResult.brandsGenerated.push(...result.brandsGenerated);

              hasMore = result.hasMore === true;
            } catch (stepError: any) {
              // If a single city times out, log it and continue to next step
              console.warn(`[agent] ${step} step failed, moving on:`, stepError.message);
              totalResult.errors.push(stepError.message);
              hasMore = false;
            }
          }
        } else {
          setAgentStatus(`${stepLabels[step]}...`);
          try {
            const result = await runStep(step);
            if (result.citiesSuggested) totalResult.citiesSuggested += result.citiesSuggested;
            if (result.citiesResearched?.length) totalResult.citiesResearched.push(...result.citiesResearched);
            if (result.brandsGenerated?.length) totalResult.brandsGenerated.push(...result.brandsGenerated);
          } catch (stepError: any) {
            console.warn(`[agent] ${step} step failed, moving on:`, stepError.message);
            totalResult.errors.push(stepError.message);
          }
        }
      }

      const parts = [];
      if (totalResult.citiesSuggested) parts.push(`${totalResult.citiesSuggested} suggested`);
      if (totalResult.citiesResearched.length) parts.push(`${totalResult.citiesResearched.length} researched`);
      if (totalResult.brandsGenerated.length) parts.push(`${totalResult.brandsGenerated.length} branded`);
      if (totalResult.errors.length) parts.push(`${totalResult.errors.length} errors`);

      const summary = parts.join(', ') || 'no changes needed';
      if (totalResult.errors.length > 0) {
        toast.error(`Agent finished with issues: ${summary}`);
      } else {
        toast.success(`Agent completed: ${summary}`);
      }

      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to run agent');
    } finally {
      setIsRunningAgent(false);
      setAgentStatus(null);
    }
  };

  // Cities needing the current user's vote (only pending_review — auto-advanced/rejected cities are excluded)
  const citiesNeedingVote = cities.filter(c => {
    if (!userEmail) return false;
    if (!['researched', 'brand_ready'].includes(c.status)) return false;
    if (c.review_status && c.review_status !== 'pending_review') return false;
    const cityVotes = reviews[c.id] || [];
    return !cityVotes.some(v => v.reviewer_email === userEmail);
  });

  const handleVote = async (cityId: string, vote: 'interested' | 'not_now' | 'reject') => {
    setVotingCityId(cityId);
    try {
      const res = await fetch('/api/admin/expansion/reviews/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_id: cityId, vote }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit vote');
      }

      const result = await res.json();
      const voteLabels = { interested: 'Interested', not_now: 'Not Now', reject: 'Reject' };
      toast.success(`Voted "${voteLabels[vote]}" — ${result.review_status?.replace(/_/g, ' ')}`);

      // Update reviews state with full vote records from API
      setReviews(prev => ({
        ...prev,
        [cityId]: result.votes,
      }));
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit vote');
    } finally {
      setVotingCityId(null);
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
    citiesNeedingVote.length +
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
          {canManage && (
            <>
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
                {agentStatus || (isRunningAgent ? 'Running...' : 'Run Agent Now')}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg transition-colors text-sm font-medium text-gray-300"
              >
                <Plus className="w-4 h-4" />
                Add City
              </button>
            </>
          )}
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

      {/* Compact Attention Summary */}
      {attentionCount > 0 && (
        <div className="bg-tastelanc-surface rounded-xl border border-amber-500/20 p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm font-medium text-white">
              {attentionCount} item{attentionCount !== 1 ? 's' : ''} need{attentionCount === 1 ? 's' : ''} your attention
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {citiesNeedingVote.length > 0 && (
              <button
                onClick={() => setShowVoteQueue(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                {citiesNeedingVote.length} to vote on
              </button>
            )}
            {pendingReview.brandsToReview.length > 0 && (
              <Link
                href={`/admin/expansion/${pendingReview.brandsToReview[0].id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
              >
                <Palette className="w-3.5 h-3.5" />
                {pendingReview.brandsToReview.length} brand{pendingReview.brandsToReview.length !== 1 ? 's' : ''} to select
              </Link>
            )}
            {pendingReview.citiesToApprove.length > 0 && (
              <Link
                href={`/admin/expansion/${pendingReview.citiesToApprove[0].id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {pendingReview.citiesToApprove.length} to approve
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Inline Vote Queue (shown when "to vote on" is clicked) */}
      {showVoteQueue && citiesNeedingVote.length > 0 && (
        <div className="bg-tastelanc-surface rounded-xl border border-blue-500/20 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400" />
              Vote on Markets ({citiesNeedingVote.length})
            </p>
            <button
              onClick={() => setShowVoteQueue(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1.5">
            {citiesNeedingVote.map((city) => (
              <div
                key={`vote-${city.id}`}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Link href={`/admin/expansion/${city.id}`} className="flex-1 min-w-0 hover:underline">
                  <span className="text-sm text-white">{city.city_name}, {city.state}</span>
                  <span className="ml-2 text-xs text-gray-500">{city.market_potential_score ?? '?'}/100</span>
                </Link>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleVote(city.id, 'interested')}
                    disabled={votingCityId === city.id}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50"
                  >
                    Interested
                  </button>
                  <button
                    onClick={() => handleVote(city.id, 'not_now')}
                    disabled={votingCityId === city.id}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25 transition-colors disabled:opacity-50"
                  >
                    Not Now
                  </button>
                  <button
                    onClick={() => handleVote(city.id, 'reject')}
                    disabled={votingCityId === city.id}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
