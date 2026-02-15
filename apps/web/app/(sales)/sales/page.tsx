'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Briefcase,
  Plus,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
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

export default function SalesDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [followUpLeads, setFollowUpLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/sales/leads');
        const data = await res.json();

        setStats(data.stats || null);

        const leads: Lead[] = data.leads || [];
        setRecentLeads(leads.slice(0, 5));

        // Leads needing follow-up: contacted or interested, last contact > 3 days ago
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
        const needsFollowUp = leads.filter(
          (l) =>
            ['contacted', 'interested', 'new'].includes(l.status) &&
            (!l.last_contacted_at || l.last_contacted_at < threeDaysAgo)
        );
        setFollowUpLeads(needsFollowUp.slice(0, 5));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
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
            <TrendingUp className="w-8 h-8 text-tastelanc-accent" />
            Sales Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Track your pipeline and outreach</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/sales/leads/new"
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        </div>
      </div>

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
