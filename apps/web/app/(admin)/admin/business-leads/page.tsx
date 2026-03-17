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
  Upload,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  ShoppingCart,
  User,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { toast } from 'sonner';

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
  assigned_to: string | null;
  assigned_rep: { id: string; full_name: string } | null;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  notInterested: number;
  converted: number;
}

interface MarketOption {
  id: string;
  slug: string;
  name: string;
}

interface RepOption {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400', icon: Mail },
  interested: { label: 'Interested', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  not_interested: { label: 'Not Interested', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  converted: { label: 'Converted', color: 'bg-lancaster-gold/20 text-lancaster-gold', icon: CheckCircle },
};

const CATEGORIES = ['restaurant', 'bar', 'cafe', 'brewery', 'bakery', 'food_truck', 'other'];

export default function BusinessLeadsPage() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [reps, setReps] = useState<RepOption[]>([]);
  const [isScopedAdmin, setIsScopedAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [marketFilter, setMarketFilter] = useState('all');
  const [repFilter, setRepFilter] = useState('all');
  const [isConverting, setIsConverting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (marketFilter !== 'all') params.set('market', marketFilter);
      if (repFilter !== 'all') params.set('rep', repFilter);

      const res = await fetch(`/api/admin/business-leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || null);
      if (data.markets) setMarkets(data.markets);
      if (data.reps) setReps(data.reps);
      if (data.isScopedAdmin !== undefined) setIsScopedAdmin(data.isScopedAdmin);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, categoryFilter, marketFilter, repFilter]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleConvertContacts = async () => {
    if (!confirm('This will convert all contact submissions to business leads. Continue?')) {
      return;
    }

    setIsConverting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/business-leads/convert-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to convert contacts');
      }

      toast.success(`Converted ${data.converted} contacts`);
      setMessage({
        type: 'success',
        text: `Converted ${data.converted} contacts. ${data.skipped} skipped (already exist).`,
      });
      fetchLeads();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to convert contacts';
      toast.error(msg);
      setMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/business-leads/${leadId}`, {
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
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleRepAssign = async (leadId: string, repId: string) => {
    try {
      const assignedTo = repId === 'unassigned' ? null : repId;
      const res = await fetch(`/api/admin/business-leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignedTo }),
      });

      if (!res.ok) {
        throw new Error('Failed to reassign lead');
      }

      const repName = repId === 'unassigned' ? null : reps.find((r) => r.id === repId)?.name || 'Unknown';
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === leadId
            ? {
                ...lead,
                assigned_to: assignedTo,
                assigned_rep: assignedTo ? { id: assignedTo, full_name: repName! } : null,
              }
            : lead
        )
      );
      toast.success(repId === 'unassigned' ? 'Lead unassigned' : `Lead assigned to ${repName}`);
    } catch (error) {
      console.error('Error reassigning lead:', error);
      toast.error('Failed to reassign lead');
    }
  };

  const activeFilterCount = [
    statusFilter !== 'all',
    categoryFilter !== 'all',
    marketFilter !== 'all',
    repFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-tastelanc-text-primary flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-tastelanc-accent" />
            Business Leads
          </h1>
          <p className="text-tastelanc-text-muted mt-1">Manage B2B outreach and restaurant partnerships</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleConvertContacts}
            disabled={isConverting}
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-primary rounded-lg transition-colors"
          >
            {isConverting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Convert Contacts
          </button>
          <Link
            href="/admin/business-leads/import"
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-primary rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          <Link
            href="/admin/business-leads/new"
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-tastelanc-text-primary">{stats.total}</div>
            <div className="text-sm text-tastelanc-text-muted">Total Leads</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.new}</div>
            <div className="text-sm text-tastelanc-text-muted">New</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-400">{stats.contacted}</div>
            <div className="text-sm text-tastelanc-text-muted">Contacted</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-400">{stats.interested}</div>
            <div className="text-sm text-tastelanc-text-muted">Interested</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-red-400">{stats.notInterested}</div>
            <div className="text-sm text-tastelanc-text-muted">Not Interested</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-lancaster-gold">{stats.converted}</div>
            <div className="text-sm text-tastelanc-text-muted">Converted</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col gap-4">
          {/* Search row */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tastelanc-text-muted" />
              <input
                type="text"
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary placeholder-tastelanc-text-faint focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              />
            </div>
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap gap-3">
            {/* Market filter — only shown to super_admin/co_founder */}
            {!isScopedAdmin && markets.length > 0 && (
              <select
                value={marketFilter}
                onChange={(e) => setMarketFilter(e.target.value)}
                className="px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              >
                <option value="all">All Markets</option>
                {markets.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
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
              className="px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                </option>
              ))}
            </select>

            {/* Rep filter */}
            {reps.length > 0 && (
              <select
                value={repFilter}
                onChange={(e) => setRepFilter(e.target.value)}
                className="px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
              >
                <option value="all">All Reps</option>
                <option value="unassigned">Unassigned</option>
                {reps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.name}
                  </option>
                ))}
              </select>
            )}

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setMarketFilter('all');
                  setRepFilter('all');
                  setSearch('');
                }}
                className="px-4 py-2.5 text-sm text-tastelanc-text-muted hover:text-tastelanc-text-primary transition-colors"
              >
                Clear filters ({activeFilterCount})
              </button>
            )}
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
          <Users className="w-12 h-12 text-tastelanc-text-faint mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tastelanc-text-primary mb-2">No leads found</h3>
          <p className="text-tastelanc-text-muted mb-4">
            {search || statusFilter !== 'all' || categoryFilter !== 'all' || marketFilter !== 'all' || repFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first business lead to get started'}
          </p>
          {!search && statusFilter === 'all' && categoryFilter === 'all' && marketFilter === 'all' && repFilter === 'all' && (
            <div className="flex justify-center gap-3">
              <Link
                href="/admin/business-leads/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Lead
              </Link>
              <button
                onClick={handleConvertContacts}
                className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-tastelanc-text-primary rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Import from Contacts
              </button>
            </div>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-tastelanc-text-primary truncate">
                        {lead.business_name}
                      </h3>
                      <Badge className={statusConfig.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {lead.category && (
                        <Badge className="bg-tastelanc-surface-light text-tastelanc-text-secondary">
                          {lead.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-tastelanc-text-muted">
                      {lead.contact_name && (
                        <span>{lead.contact_name}</span>
                      )}
                      <Link
                        href={`/sales/inbox?compose=true&to=${encodeURIComponent(lead.email)}&business=${encodeURIComponent(lead.business_name || '')}`}
                        className="flex items-center gap-1 hover:text-tastelanc-text-primary"
                      >
                        <Mail className="w-3 h-3" />
                        {lead.email}
                      </Link>
                      {lead.phone && (
                        <a
                          href={`tel:${lead.phone}`}
                          className="flex items-center gap-1 hover:text-tastelanc-text-primary"
                        >
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </a>
                      )}
                      {lead.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {lead.city}
                        </span>
                      )}
                      {lead.website && (
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-tastelanc-text-primary"
                        >
                          <Globe className="w-3 h-3" />
                          Website
                        </a>
                      )}
                      {lead.assigned_rep && (
                        <span className="flex items-center gap-1 text-tastelanc-accent">
                          <User className="w-3 h-3" />
                          {lead.assigned_rep.full_name}
                        </span>
                      )}
                    </div>
                    {lead.notes && (
                      <p className="mt-2 text-sm text-tastelanc-text-faint line-clamp-1">
                        <MessageSquare className="w-3 h-3 inline mr-1" />
                        {lead.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                      className="px-3 py-1.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="not_interested">Not Interested</option>
                      <option value="converted">Converted</option>
                    </select>
                    {reps.length > 0 && (
                      <select
                        value={lead.assigned_to || 'unassigned'}
                        onChange={(e) => handleRepAssign(lead.id, e.target.value)}
                        className="px-3 py-1.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded text-sm text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent max-w-[140px]"
                      >
                        <option value="unassigned">Unassigned</option>
                        {reps.map((rep) => (
                          <option key={rep.id} value={rep.id}>
                            {rep.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <Link
                      href={`/sales/inbox?compose=true&to=${encodeURIComponent(lead.email)}&business=${encodeURIComponent(lead.business_name || '')}`}
                      className="p-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface rounded-lg transition-colors"
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4 text-tastelanc-text-primary" />
                    </Link>
                    <Link
                      href={`/admin/sales?email=${encodeURIComponent(lead.email)}&name=${encodeURIComponent(lead.contact_name || lead.business_name)}&phone=${encodeURIComponent(lead.phone || '')}&businessName=${encodeURIComponent(lead.business_name)}`}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors"
                      title="Create Sale"
                    >
                      <ShoppingCart className="w-4 h-4 text-green-400" />
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
