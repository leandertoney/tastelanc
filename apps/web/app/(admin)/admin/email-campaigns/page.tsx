'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Send,
  Eye,
  MousePointer,
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  Users,
  Percent,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  segment: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  sent_at: string | null;
  created_at: string;
}

interface CampaignStats {
  totalCampaigns: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: string;
  clickRate: string;
}

interface RecipientCounts {
  all: number;
  unconverted: number;
  converted: number;
}

export default function EmailCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/email-campaigns');
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setStats(data.stats || null);
      setRecipientCounts(data.recipientCounts || null);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    setDeleteId(id);
    try {
      const res = await fetch(`/api/admin/email-campaigns/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not sent';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="accent" className="bg-green-500/20 text-green-400">Sent</Badge>;
      case 'sending':
        return <Badge variant="accent" className="bg-yellow-500/20 text-yellow-400">Sending</Badge>;
      case 'draft':
      default:
        return <Badge variant="default">Draft</Badge>;
    }
  };

  const getSegmentLabel = (segment: string) => {
    switch (segment) {
      case 'all':
        return 'All Waitlist';
      case 'unconverted':
        return 'Unconverted';
      case 'converted':
        return 'Converted';
      default:
        return segment;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-tastelanc-accent/30 border-t-tastelanc-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Email Campaigns</h1>
          <p className="text-gray-400 mt-1 text-sm md:text-base">
            Send promotional emails to your waitlist
          </p>
        </div>
        <Link
          href="/admin/email-campaigns/new"
          className="inline-flex items-center justify-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalCampaigns || 0}</p>
              <p className="text-xs text-gray-500">Campaigns</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.totalSent || 0}</p>
              <p className="text-xs text-gray-500">Emails Sent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.openRate || '0'}%</p>
              <p className="text-xs text-gray-500">Open Rate</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <MousePointer className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats?.clickRate || '0'}%</p>
              <p className="text-xs text-gray-500">Click Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recipient Counts */}
      {recipientCounts && (
        <Card className="p-4 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-tastelanc-accent" />
            <h3 className="font-semibold text-white">Available Recipients</h3>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-gray-400">All Waitlist:</span>{' '}
              <span className="text-white font-semibold">{recipientCounts.all}</span>
            </div>
            <div>
              <span className="text-gray-400">Unconverted:</span>{' '}
              <span className="text-white font-semibold">{recipientCounts.unconverted}</span>
            </div>
            <div>
              <span className="text-gray-400">Converted:</span>{' '}
              <span className="text-white font-semibold">{recipientCounts.converted}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Mail className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No campaigns yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first email campaign to reach your waitlist
          </p>
          <Link
            href="/admin/email-campaigns/new"
            className="inline-flex items-center gap-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Campaign Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Link
                      href={`/admin/email-campaigns/${campaign.id}`}
                      className="text-lg font-semibold text-white hover:text-tastelanc-accent truncate"
                    >
                      {campaign.name}
                    </Link>
                    {getStatusBadge(campaign.status)}
                  </div>
                  <p className="text-gray-400 text-sm truncate mb-2">{campaign.subject}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {getSegmentLabel(campaign.segment)} ({campaign.total_recipients})
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {campaign.status === 'sent' ? formatDate(campaign.sent_at) : 'Draft'}
                    </span>
                  </div>
                </div>

                {/* Stats (only for sent campaigns) */}
                {campaign.status === 'sent' && (
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="text-white font-semibold">{campaign.total_sent}</p>
                      <p className="text-gray-500 text-xs">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold">{campaign.total_opened}</p>
                      <p className="text-gray-500 text-xs">Opened</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold">{campaign.total_clicked}</p>
                      <p className="text-gray-500 text-xs">Clicked</p>
                    </div>
                    {campaign.total_bounced > 0 && (
                      <div className="text-center">
                        <p className="text-red-400 font-semibold">{campaign.total_bounced}</p>
                        <p className="text-gray-500 text-xs">Bounced</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/email-campaigns/${campaign.id}`}
                    className="px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-white rounded-lg transition-colors text-sm"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    disabled={deleteId === campaign.id}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete campaign"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
