'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  Loader2,
  ArrowLeft,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ExpansionJobListing } from '@/lib/ai/expansion-types';

const JOB_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-blue-500/20 text-blue-400' },
  approved: { label: 'Approved', className: 'bg-green-500/20 text-green-400' },
  posted: { label: 'Posted', className: 'bg-emerald-500/20 text-emerald-400' },
  closed: { label: 'Closed', className: 'bg-gray-500/20 text-gray-400' },
};

const ROLE_LABELS: Record<string, string> = {
  sales_rep: 'Sales Rep',
  market_manager: 'Market Manager',
  content_creator: 'Content Creator',
  community_manager: 'Community Manager',
};

interface JobWithCity extends ExpansionJobListing {
  expansion_cities?: { city_name: string; state: string; slug: string };
}

export default function AllJobListingsPage() {
  const [jobs, setJobs] = useState<JobWithCity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      const res = await fetch('/api/admin/expansion/cities');
      if (!res.ok) throw new Error('Failed to fetch cities');
      const { cities } = await res.json();

      const allJobs: JobWithCity[] = [];
      for (const city of cities) {
        const jobRes = await fetch(`/api/admin/expansion/cities/${city.id}/jobs`);
        if (jobRes.ok) {
          const { jobs: cityJobs } = await jobRes.json();
          for (const job of cityJobs) {
            allJobs.push({
              ...job,
              expansion_cities: {
                city_name: city.city_name,
                state: city.state,
                slug: city.slug,
              },
            });
          }
        }
      }

      setJobs(allJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load job listings');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(job: JobWithCity, newStatus: string) {
    setUpdatingId(job.id);
    try {
      const res = await fetch(
        `/api/admin/expansion/cities/${job.city_id}/jobs/${job.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (!res.ok) throw new Error('Failed to update job');
      const { job: updated } = await res.json();
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, ...updated }
            : j
        )
      );
      toast.success(`Job listing ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update job listing');
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredJobs = jobs.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (roleFilter !== 'all' && job.role_type !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(q) ||
        job.expansion_cities?.city_name.toLowerCase().includes(q) ||
        false
      );
    }
    return true;
  });

  const stats = {
    total: jobs.length,
    draft: jobs.filter((j) => j.status === 'draft').length,
    approved: jobs.filter((j) => j.status === 'approved').length,
    posted: jobs.filter((j) => j.status === 'posted').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/expansion"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-tastelanc-accent" />
            All Job Listings
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage job listings across all expansion cities
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-500">Total Listings</p>
        </div>
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <p className="text-2xl font-bold text-blue-400">{stats.draft}</p>
          <p className="text-xs text-gray-500">Drafts</p>
        </div>
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <p className="text-2xl font-bold text-green-400">{stats.approved}</p>
          <p className="text-xs text-gray-500">Approved</p>
        </div>
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <p className="text-2xl font-bold text-emerald-400">{stats.posted}</p>
          <p className="text-xs text-gray-500">Posted</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-tastelanc-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:border-tastelanc-accent"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="posted">Posted</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:border-tastelanc-accent"
        >
          <option value="all">All Roles</option>
          <option value="sales_rep">Sales Rep</option>
          <option value="market_manager">Market Manager</option>
          <option value="content_creator">Content Creator</option>
          <option value="community_manager">Community Manager</option>
        </select>
      </div>

      {/* Job Listings */}
      {filteredJobs.length === 0 ? (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-12 text-center">
          <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No job listings found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => {
            const status = JOB_STATUS_CONFIG[job.status] || JOB_STATUS_CONFIG.draft;
            const isExpanded = expandedId === job.id;
            return (
              <div
                key={job.id}
                className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{job.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-tastelanc-surface-light text-gray-300">
                        {ROLE_LABELS[job.role_type] || job.role_type}
                      </span>
                    </div>

                    {job.expansion_cities && (
                      <p className="text-sm text-gray-400 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" />
                        {job.expansion_cities.city_name}, {job.expansion_cities.state}
                      </p>
                    )}

                    {job.compensation_summary && (
                      <p className="text-sm text-gray-400 mb-2">{job.compensation_summary}</p>
                    )}

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      className="text-xs text-tastelanc-accent hover:underline"
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 text-sm text-gray-300 whitespace-pre-wrap border-t border-tastelanc-surface-light pt-3">
                        {job.description}
                        {job.requirements && job.requirements.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-white mb-1">Requirements:</p>
                            <ul className="list-disc list-inside space-y-1 text-gray-400">
                              {job.requirements.map((req, i) => (
                                <li key={i}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {job.status === 'draft' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleStatusChange(job, 'approved')}
                        disabled={updatingId === job.id}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        {updatingId === job.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        onClick={() => handleStatusChange(job, 'closed')}
                        disabled={updatingId === job.id}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
