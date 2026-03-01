'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Search,
  Palette,
  Briefcase,
  Activity,
  Rocket,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ExpansionCity,
  BrandDraft,
  ExpansionJobListing,
  ActivityLogEntry,
  JobRoleType,
  ExpansionReview,
} from '@/lib/ai/expansion-types';
import CityResearchPanel from '@/components/admin/expansion/CityResearchPanel';
import BrandProposalCard from '@/components/admin/expansion/BrandProposalCard';
import JobListingCard from '@/components/admin/expansion/JobListingCard';
import ActivityTimeline from '@/components/admin/expansion/ActivityTimeline';

// ─────────────────────────────────────────────────────────
// Status badge config (shared with pipeline card)
// ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  researching: { label: 'Researching', className: 'bg-blue-500/20 text-blue-400' },
  researched: { label: 'Researched', className: 'bg-purple-500/20 text-purple-400' },
  brand_ready: { label: 'Brand Ready', className: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: 'Approved', className: 'bg-green-500/20 text-green-400' },
  setup_in_progress: { label: 'Setting Up', className: 'bg-orange-500/20 text-orange-400' },
  live: { label: 'Live', className: 'bg-emerald-500/20 text-emerald-400' },
  on_hold: { label: 'On Hold', className: 'bg-gray-500/20 text-gray-400' },
  rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-400' },
};

type TabKey = 'research' | 'brand' | 'jobs' | 'activity';

const TABS: { key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'research', label: 'Research', icon: Search },
  { key: 'brand', label: 'Brand', icon: Palette },
  { key: 'jobs', label: 'Jobs', icon: Briefcase },
  { key: 'activity', label: 'Activity', icon: Activity },
];

const ROLE_OPTIONS: { value: JobRoleType; label: string }[] = [
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'market_manager', label: 'Market Manager' },
  { value: 'content_creator', label: 'Content Creator' },
  { value: 'community_manager', label: 'Community Manager' },
];

export default function CityDetailPage() {
  const { id } = useParams<{ id: string }>();

  // ─── State ───────────────────────────────────────────
  const [city, setCity] = useState<ExpansionCity | null>(null);
  const [brands, setBrands] = useState<BrandDraft[]>([]);
  const [jobs, setJobs] = useState<ExpansionJobListing[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [cityReviews, setCityReviews] = useState<ExpansionReview[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('research');

  const [isLoading, setIsLoading] = useState(true);
  const [isResearching, setIsResearching] = useState(false);
  const [isGeneratingBrands, setIsGeneratingBrands] = useState(false);
  const [selectingBrandId, setSelectingBrandId] = useState<string | null>(null);
  const [isGeneratingJob, setIsGeneratingJob] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [jobRoleType, setJobRoleType] = useState<JobRoleType>('sales_rep');

  // ─── Data fetching ───────────────────────────────────
  useEffect(() => {
    if (!id) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchAll() {
    setIsLoading(true);
    try {
      const [cityRes, brandsRes, jobsRes, activityRes, reviewsRes] = await Promise.all([
        fetch(`/api/admin/expansion/cities/${id}`),
        fetch(`/api/admin/expansion/cities/${id}/brands`),
        fetch(`/api/admin/expansion/cities/${id}/jobs`),
        fetch(`/api/admin/expansion/activity?city_id=${id}`),
        fetch('/api/admin/expansion/reviews'),
      ]);

      if (cityRes.ok) {
        const data = await cityRes.json();
        setCity(data.city);
      }
      if (brandsRes.ok) {
        const data = await brandsRes.json();
        setBrands(data.brands || []);
      }
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }
      if (activityRes.ok) {
        const data = await activityRes.json();
        setActivities(data.activities || []);
      }
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        const allReviews: ExpansionReview[] = data.reviews || [];
        setCityReviews(allReviews.filter((r: ExpansionReview) => r.city_id === id));
      }
    } catch (err) {
      console.error('Error fetching city details:', err);
      toast.error('Failed to load city details');
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Actions ─────────────────────────────────────────

  async function handleResearch() {
    setIsResearching(true);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/research`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Research failed');
      }
      const data = await res.json();
      setCity(data.city);
      toast.success('Research completed');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to research city');
    } finally {
      setIsResearching(false);
    }
  }

  async function handleGenerateBrands() {
    setIsGeneratingBrands(true);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/brands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Brand generation failed');
      }
      const data = await res.json();
      setBrands((prev) => [...prev, ...(data.brands || [])]);
      toast.success('Brand proposals generated');
      // Refresh city (status may have changed to brand_ready)
      const cityRes = await fetch(`/api/admin/expansion/cities/${id}`);
      if (cityRes.ok) {
        const cityData = await cityRes.json();
        setCity(cityData.city);
      }
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate brands');
    } finally {
      setIsGeneratingBrands(false);
    }
  }

  async function handleSelectBrand(brandId: string) {
    setSelectingBrandId(brandId);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/brands/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_selected: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to select brand');
      }
      // Update local state: deselect all, select this one
      setBrands((prev) =>
        prev.map((b) => ({
          ...b,
          is_selected: b.id === brandId,
        }))
      );
      toast.success('Brand selected');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to select brand');
    } finally {
      setSelectingBrandId(null);
    }
  }

  async function handleGenerateJob() {
    setIsGeneratingJob(true);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_type: jobRoleType }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Job generation failed');
      }
      const data = await res.json();
      setJobs((prev) => [data.job, ...prev]);
      toast.success('Job listing generated');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate job listing');
    } finally {
      setIsGeneratingJob(false);
    }
  }

  async function handleApproveJob(jobId: string) {
    setUpdatingJobId(jobId);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve job');
      }
      const data = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
      toast.success('Job listing approved');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve job');
    } finally {
      setUpdatingJobId(null);
    }
  }

  async function handleRejectJob(jobId: string) {
    setUpdatingJobId(jobId);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject job');
      }
      const data = await res.json();
      setJobs((prev) => prev.map((j) => (j.id === jobId ? data.job : j)));
      toast.success('Job listing rejected');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject job');
    } finally {
      setUpdatingJobId(null);
    }
  }

  async function handleApproveForLaunch() {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve city');
      }
      const data = await res.json();
      setCity(data.city);
      toast.success('City approved for launch');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve city');
    } finally {
      setIsApproving(false);
    }
  }

  async function handleGoLive() {
    setIsActivating(true);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}/activate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to activate city');
      }
      const data = await res.json();
      setCity(data.city);
      toast.success('City is now live!');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to go live');
    } finally {
      setIsActivating(false);
    }
  }

  async function handlePutOnHold() {
    setIsChangingStatus(true);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'on_hold' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }
      const data = await res.json();
      setCity(data.city);
      toast.success('City put on hold');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to put on hold');
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    setIsChangingStatus(true);
    try {
      const res = await fetch(`/api/admin/expansion/cities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', rejected_reason: rejectReason.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject city');
      }
      const data = await res.json();
      setCity(data.city);
      setShowRejectModal(false);
      setRejectReason('');
      toast.success('City rejected');
      // Refresh activity
      const actRes = await fetch(`/api/admin/expansion/activity?city_id=${id}`);
      if (actRes.ok) {
        const actData = await actRes.json();
        setActivities(actData.activities || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject city');
    } finally {
      setIsChangingStatus(false);
    }
  }

  // ─── Derived ─────────────────────────────────────────

  const hasSelectedBrand = brands.some((b) => b.is_selected);
  const statusConfig = city ? STATUS_CONFIG[city.status] || STATUS_CONFIG.researching : null;
  const canApprove =
    city?.status === 'brand_ready' && hasSelectedBrand;
  const canGoLive = city?.status === 'approved';
  const canChangeStatus =
    city && !['live', 'rejected'].includes(city.status);

  // ─── Loading state ───────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  if (!city) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 mb-4">City not found.</p>
        <Link
          href="/admin/expansion"
          className="text-tastelanc-accent hover:underline text-sm"
        >
          Back to Expansion Pipeline
        </Link>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back button */}
      <Link
        href="/admin/expansion"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Expansion Pipeline
      </Link>

      {/* Header */}
      <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Title + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white truncate">
                {city.city_name}
              </h1>
              {statusConfig && (
                <span
                  className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusConfig.className}`}
                >
                  {statusConfig.label}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400">
              {city.county} County, {city.state}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {canApprove && (
              <button
                onClick={handleApproveForLaunch}
                disabled={isApproving}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-sm font-medium hover:bg-green-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isApproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Approve for Launch
              </button>
            )}

            {canGoLive && (
              <button
                onClick={handleGoLive}
                disabled={isActivating}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActivating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Rocket className="w-4 h-4" />
                )}
                Go Live
              </button>
            )}

            {canChangeStatus && (
              <>
                <button
                  onClick={handlePutOnHold}
                  disabled={isChangingStatus}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-500/10 text-gray-400 border border-gray-500/20 rounded-lg text-sm font-medium hover:bg-gray-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChangingStatus ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PauseCircle className="w-4 h-4" />
                  )}
                  Put on Hold
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={isChangingStatus}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Team Reviews */}
      {(cityReviews.length > 0 || city.review_status) && (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-5">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Team Reviews
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['Leander', 'Jordan'].map((name) => {
              const review = cityReviews.find((r) => r.reviewer_name === name);
              const voteLabel = review?.vote === 'interested' ? 'Interested' : review?.vote === 'not_now' ? 'Not Now' : review?.vote === 'reject' ? 'Reject' : null;
              const voteColor = review?.vote === 'interested' ? 'text-green-400 bg-green-500/15' : review?.vote === 'not_now' ? 'text-yellow-400 bg-yellow-500/15' : review?.vote === 'reject' ? 'text-red-400 bg-red-500/15' : '';
              return (
                <div key={name} className="flex items-center justify-between bg-tastelanc-surface-light/50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{name}</p>
                    {review && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(review.voted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  {review ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${voteColor}`}>
                      {voteLabel}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/15 text-gray-500">
                      Pending
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {city.review_status && city.review_status !== 'pending_review' && (
            <div className={`mt-3 px-4 py-2.5 rounded-lg text-sm font-medium ${
              city.review_status === 'consensus_interested' ? 'bg-green-500/15 text-green-400' :
              city.review_status === 'consensus_not_now' ? 'bg-yellow-500/15 text-yellow-400' :
              city.review_status === 'consensus_reject' ? 'bg-red-500/15 text-red-400' :
              'bg-blue-500/15 text-blue-400'
            }`}>
              {city.review_status === 'consensus_interested' && 'Both founders are interested — fast-track this city!'}
              {city.review_status === 'consensus_not_now' && 'Both agreed to deprioritize — revisit later.'}
              {city.review_status === 'consensus_reject' && 'Both agreed to reject this market.'}
              {city.review_status === 'split_decision' && 'Split decision — discuss this one together.'}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-tastelanc-surface-light">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-tastelanc-accent text-tastelanc-accent'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {/* ─── Research Tab ─────────────────────── */}
        {activeTab === 'research' && (
          <CityResearchPanel
            city={city}
            onReResearch={handleResearch}
            isResearching={isResearching}
          />
        )}

        {/* ─── Brand Tab ───────────────────────── */}
        {activeTab === 'brand' && (
          <div className="space-y-4">
            {/* Generate button */}
            <div className="flex justify-end">
              <button
                onClick={handleGenerateBrands}
                disabled={isGeneratingBrands}
                className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent text-white rounded-lg text-sm font-medium hover:bg-tastelanc-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingBrands ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Brands...
                  </>
                ) : (
                  <>
                    <Palette className="w-4 h-4" />
                    Generate Brands
                  </>
                )}
              </button>
            </div>

            {brands.length === 0 ? (
              <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-8 text-center">
                <Palette className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  No brand proposals yet. Click Generate Brands to create some.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brands.map((brand) => (
                  <BrandProposalCard
                    key={brand.id}
                    brand={brand}
                    onSelect={handleSelectBrand}
                    isSelecting={selectingBrandId === brand.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Jobs Tab ────────────────────────── */}
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            {/* Generate controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-end">
              <select
                value={jobRoleType}
                onChange={(e) => setJobRoleType(e.target.value as JobRoleType)}
                className="px-3 py-2 bg-tastelanc-surface border border-tastelanc-surface-light text-white text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-tastelanc-accent"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleGenerateJob}
                disabled={isGeneratingJob}
                className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent text-white rounded-lg text-sm font-medium hover:bg-tastelanc-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingJob ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Generate Listing
                  </>
                )}
              </button>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-8 text-center">
                <Briefcase className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">
                  No job listings yet. Select a role type and click Generate Listing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobListingCard
                    key={job.id}
                    job={job}
                    onApprove={handleApproveJob}
                    onReject={handleRejectJob}
                    isUpdating={updatingJobId === job.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Activity Tab ────────────────────── */}
        {activeTab === 'activity' && (
          <ActivityTimeline activities={activities} />
        )}
      </div>

      {/* ─── Reject Modal ────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">Reject City</h3>
            <p className="text-sm text-gray-400 mb-4">
              Please provide a reason for rejecting {city.city_name}.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={4}
              className="w-full px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light text-white text-sm rounded-lg focus:outline-none focus:ring-1 focus:ring-tastelanc-accent placeholder-gray-600 resize-none"
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={isChangingStatus || !rejectReason.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isChangingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject City
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
