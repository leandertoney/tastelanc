'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Search,
  Mail,
  Phone,
  Globe,
  MapPin,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ShoppingCart,
  FileText,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface BusinessLead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  city: string | null;
  category: string | null;
  status: string;
  source: string;
  tags: string[];
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  notInterested: number;
  converted: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400', icon: Mail },
  interested: { label: 'Interested', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  not_interested: { label: 'Not Interested', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  converted: { label: 'Converted', color: 'bg-lancaster-gold/20 text-lancaster-gold', icon: CheckCircle },
};

const CATEGORIES = ['restaurant', 'bar', 'cafe', 'brewery', 'bakery', 'food_truck', 'other'];

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);

      const res = await fetch(`/api/sales/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, categoryFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/sales/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-tastelanc-accent" />
            Business Leads
          </h1>
          <p className="text-gray-400 mt-1">Manage outreach and restaurant partnerships</p>
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

      {/* Stats */}
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

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not Interested</option>
              <option value="converted">Converted</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Leads List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
        </div>
      ) : leads.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No leads found</h3>
          <p className="text-gray-400 mb-4">
            {search || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first business lead to get started'}
          </p>
          {!search && statusFilter === 'all' && categoryFilter === 'all' && (
            <Link
              href="/sales/leads/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Lead
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
            const StatusIcon = statusConfig.icon;

            return (
              <Card key={lead.id} className="p-4 hover:bg-tastelanc-surface-light/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Lead Info */}
                  <Link href={`/sales/leads/${lead.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white truncate">
                        {lead.business_name}
                      </h3>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {lead.category && (
                        <Badge className="bg-tastelanc-surface-light text-gray-300">
                          {lead.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                      {lead.contact_name && <span>{lead.contact_name}</span>}
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </span>
                      {lead.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </span>
                      )}
                      {lead.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.city}
                        </span>
                      )}
                    </div>
                    {lead.notes && (
                      <p className="mt-2 text-sm text-gray-500 line-clamp-1">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        {lead.notes}
                      </p>
                    )}
                  </Link>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="px-3 py-1.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="not_interested">Not Interested</option>
                      <option value="converted">Converted</option>
                    </select>
                    <a
                      href={`mailto:${lead.email}`}
                      className="p-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg transition-colors"
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4 text-white" />
                    </a>
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg transition-colors"
                        title="Call"
                      >
                        <Phone className="w-4 h-4 text-white" />
                      </a>
                    )}
                    <Link
                      href={`/sales/checkout?email=${encodeURIComponent(lead.email)}&name=${encodeURIComponent(lead.contact_name || lead.business_name)}&phone=${encodeURIComponent(lead.phone || '')}&businessName=${encodeURIComponent(lead.business_name)}`}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                      title="Create Sale"
                    >
                      <ShoppingCart className="w-4 h-4 text-green-400" />
                    </Link>
                    <Link
                      href={`/sales/leads/${lead.id}`}
                      className="p-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FileText className="w-4 h-4 text-white" />
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
