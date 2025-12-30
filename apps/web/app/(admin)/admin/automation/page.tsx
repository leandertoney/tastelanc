'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Plus,
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Users,
  Briefcase,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface ScheduledCampaign {
  id: string;
  name: string;
  campaign_type: 'scheduled' | 'countdown' | 'trigger';
  target_audience: string;
  scheduled_at: string | null;
  countdown_target_date: string | null;
  days_before: number | null;
  trigger_event: string | null;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  next_run_at: string | null;
  last_run_at: string | null;
  total_sent: number;
  created_at: string;
  email_templates: { name: string } | null;
}

const getAudienceLabel = (audience: string) => {
  switch (audience) {
    case 'consumer_all':
      return 'All Consumers';
    case 'consumer_unconverted':
      return 'Unconverted Signups';
    case 'consumer_converted':
      return 'Converted Users';
    case 'business_leads':
      return 'Business Leads';
    default:
      return audience;
  }
};

const getCampaignTypeLabel = (type: string) => {
  switch (type) {
    case 'scheduled':
      return 'Scheduled';
    case 'countdown':
      return 'Countdown';
    case 'trigger':
      return 'Trigger';
    default:
      return type;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function AutomationPage() {
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/admin/scheduled-campaigns?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch campaigns');
      }

      setCampaigns(data.campaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  const handleToggleStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/scheduled-campaigns/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle status');
      }

      const data = await response.json();
      setCampaigns(
        campaigns.map((c) => (c.id === id ? data.campaign : c))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/scheduled-campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      setCampaigns(campaigns.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-1/4"></div>
          <div className="h-32 bg-neutral-800 rounded"></div>
          <div className="h-32 bg-neutral-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Automation
          </h1>
          <p className="text-neutral-400 mt-1">
            Scheduled and automated email campaigns
          </p>
        </div>
        <Link
          href="/admin/automation/new"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Automation
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-300 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'active', 'paused', 'completed'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-red-600 text-white'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center py-16 bg-neutral-900 rounded-xl border border-neutral-800">
          <Zap className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            No automations found
          </h3>
          <p className="text-neutral-400 mb-6">
            Create your first automated campaign
          </p>
          <Link
            href="/admin/automation/new"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Automation
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">
                      {campaign.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        campaign.status === 'active'
                          ? 'bg-green-900/50 text-green-300'
                          : campaign.status === 'paused'
                          ? 'bg-yellow-900/50 text-yellow-300'
                          : campaign.status === 'completed'
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                    <span className="flex items-center gap-1">
                      {campaign.campaign_type === 'countdown' ? (
                        <Calendar className="w-4 h-4" />
                      ) : campaign.campaign_type === 'trigger' ? (
                        <Zap className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      {getCampaignTypeLabel(campaign.campaign_type)}
                    </span>

                    <span className="flex items-center gap-1">
                      {campaign.target_audience === 'business_leads' ? (
                        <Briefcase className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                      {getAudienceLabel(campaign.target_audience)}
                    </span>

                    {campaign.next_run_at && campaign.status === 'active' && (
                      <span className="text-green-400">
                        Next: {formatDate(campaign.next_run_at)}
                      </span>
                    )}

                    {campaign.last_run_at && (
                      <span>Last: {formatDate(campaign.last_run_at)}</span>
                    )}

                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {campaign.total_sent} sent
                    </span>
                  </div>

                  {/* Template */}
                  {campaign.email_templates && (
                    <p className="text-xs text-neutral-500 mt-2">
                      Template: {campaign.email_templates.name}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(campaign.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      campaign.status === 'active'
                        ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                        : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                    }`}
                    title={
                      campaign.status === 'active' ? 'Pause' : 'Resume'
                    }
                  >
                    {campaign.status === 'active' ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() =>
                      deleteConfirm === campaign.id
                        ? handleDelete(campaign.id)
                        : setDeleteConfirm(campaign.id)
                    }
                    className={`p-2 rounded-lg transition-colors ${
                      deleteConfirm === campaign.id
                        ? 'bg-red-600 text-white'
                        : 'bg-neutral-800 text-neutral-400 hover:text-red-400'
                    }`}
                    title={
                      deleteConfirm === campaign.id
                        ? 'Click again to confirm'
                        : 'Delete'
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
