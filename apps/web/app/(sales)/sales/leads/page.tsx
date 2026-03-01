'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  Search,
  Mail,
  Phone,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart,
  FileText,
  PhoneCall,
  Video,
  CalendarCheck,
  Download,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Unlock,
  Lock,
  HelpCircle,
} from 'lucide-react';
import { Card, Badge, Tooltip } from '@/components/ui';
import { toast } from 'sonner';
import { getLeadAge } from '@/lib/utils/lead-aging';

interface BusinessLead {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
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
  updated_at: string;
  activity_types: string[];
  assigned_to: string | null;
  assigned_to_name: string | null;
  has_unread_replies: boolean;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  interested: number;
  notInterested: number;
  converted: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortColumn = 'business_name' | 'contact_name' | 'city' | 'category' | 'status' | 'created_at' | 'last_contacted_at';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  new: { label: 'New', color: 'bg-blue-500/20 text-blue-400', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-yellow-500/20 text-yellow-400', icon: Mail },
  interested: { label: 'Interested', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  not_interested: { label: 'Not Interested', color: 'bg-red-500/20 text-red-400', icon: XCircle },
  converted: { label: 'Converted', color: 'bg-lancaster-gold/20 text-lancaster-gold', icon: CheckCircle },
};

const ACTIVITY_ICONS: Record<string, { icon: typeof PhoneCall; label: string; color: string }> = {
  call: { icon: PhoneCall, label: 'Called', color: 'text-green-400' },
  email: { icon: Mail, label: 'Emailed', color: 'text-blue-400' },
  meeting: { icon: Video, label: 'Met', color: 'text-purple-400' },
  note: { icon: FileText, label: 'Note', color: 'text-gray-400' },
  follow_up: { icon: CalendarCheck, label: 'Follow-up', color: 'text-yellow-400' },
};

const CATEGORIES = ['restaurant', 'bar', 'cafe', 'brewery', 'bakery', 'food_truck', 'other'];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRelativeDate(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateStr);
}

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'mine'>('all');
  const [sortBy, setSortBy] = useState<SortColumn>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const fetchLeads = async (pageOverride?: number) => {
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('page', String(pageOverride ?? pagination.page));
      params.set('limit', String(pagination.limit));
      params.set('sort_by', sortBy);
      params.set('sort_dir', sortDir);

      const res = await fetch(`/api/sales/leads?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setStats(data.stats || null);
      if (data.pagination) setPagination(data.pagination);
      if (data.currentUserId) setCurrentUserId(data.currentUserId);
      if (data.isAdmin) setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error('Error fetching leads:', error);
      setFetchError(true);
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    fetchLeads(1);
  }, [statusFilter, categoryFilter, sortBy, sortDir]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPagination((p) => ({ ...p, page: 1 }));
      fetchLeads(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: p }));
    fetchLeads(p);
  };

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
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Business Name',
      'Contact Name',
      'Email',
      'Phone',
      'City',
      'Category',
      'Status',
      'Outreach',
      'Assigned To',
      'Last Contacted',
      'Date Added',
      'Notes',
    ];

    const escapeCSV = (val: string) => {
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = leads.map((lead) => [
      escapeCSV(lead.business_name),
      escapeCSV(lead.contact_name || ''),
      escapeCSV(lead.email || ''),
      escapeCSV(lead.phone || ''),
      escapeCSV(lead.city || ''),
      escapeCSV(lead.category || ''),
      escapeCSV(STATUS_CONFIG[lead.status]?.label || lead.status),
      escapeCSV((lead.activity_types || []).map((t) => ACTIVITY_ICONS[t]?.label || t).join(', ')),
      escapeCSV(lead.assigned_to_name || 'Unassigned'),
      lead.last_contacted_at ? formatDate(lead.last_contacted_at) : '',
      formatDate(lead.created_at),
      escapeCSV(lead.notes || ''),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${leads.length} leads`);
  };

  const tdClass = 'px-3 py-3 text-sm whitespace-nowrap';

  const SortHeader = ({ column, label, className }: { column: SortColumn | null; label: string; className?: string }) => {
    const isSorted = column && sortBy === column;
    return (
      <th
        className={`px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${column ? 'cursor-pointer select-none hover:text-gray-200 transition-colors' : ''} ${className || ''}`}
        onClick={() => column && handleSort(column)}
      >
        <span className="flex items-center gap-1">
          {label}
          {column && (
            isSorted
              ? (sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />)
              : <ChevronsUpDown className="w-3 h-3 text-gray-600" />
          )}
        </span>
      </th>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-tastelanc-accent" />
            Business Leads
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-400">Manage outreach and restaurant partnerships</p>
            <Tooltip content="Your lead pipeline. Change status by clicking the status badge on each row. Click a lead name to view details, log activities, or send emails. Leads idle 7+ days get a follow-up nudge; 14+ days become claimable by other reps." position="bottom">
              <HelpCircle className="w-4 h-4 text-gray-600 hover:text-gray-400 cursor-help" />
            </Tooltip>
          </div>
        </div>
        <div className="flex gap-3">
          {leads.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-tastelanc-surface-light hover:bg-tastelanc-surface text-gray-300 hover:text-white rounded-lg transition-colors border border-tastelanc-surface-light"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
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
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
          <Card className="p-3">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Leads</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-blue-400">{stats.new}</div>
            <div className="text-xs text-gray-400">New</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-yellow-400">{stats.contacted}</div>
            <div className="text-xs text-gray-400">Contacted</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-green-400">{stats.interested}</div>
            <div className="text-xs text-gray-400">Interested</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-red-400">{stats.notInterested}</div>
            <div className="text-xs text-gray-400">Not Interested</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-lancaster-gold">{stats.converted}</div>
            <div className="text-xs text-gray-400">Converted</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 mb-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>
          <div className="flex gap-3">
            {/* My Leads / All Leads toggle */}
            <div className="flex rounded-lg overflow-hidden border border-tastelanc-surface-light">
              <button
                onClick={() => setOwnerFilter('all')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  ownerFilter === 'all'
                    ? 'bg-tastelanc-accent text-white'
                    : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
                }`}
              >
                All Leads
              </button>
              <button
                onClick={() => setOwnerFilter('mine')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  ownerFilter === 'mine'
                    ? 'bg-tastelanc-accent text-white'
                    : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
                }`}
              >
                My Leads
              </button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
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
              className="px-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
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

      {/* Leads Table */}
      {(() => {
        const filteredLeads = ownerFilter === 'mine' && currentUserId
          ? leads.filter((l) => l.assigned_to === currentUserId)
          : leads;
        return isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
        </div>
      ) : fetchError && filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load leads</h3>
          <p className="text-gray-400 mb-4">Something went wrong. Please try again.</p>
          <button
            onClick={() => fetchLeads(1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </Card>
      ) : filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No leads found</h3>
          <p className="text-gray-400 mb-4">
            {search || statusFilter !== 'all' || categoryFilter !== 'all' || ownerFilter === 'mine'
              ? 'Try adjusting your filters'
              : 'Add your first business lead to get started'}
          </p>
          {!search && statusFilter === 'all' && categoryFilter === 'all' && ownerFilter === 'all' && (
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[15%]" />{/* Business */}
                <col className="w-[13%]" />{/* Contact */}
                <col className="w-[10%]" />{/* Phone */}
                <col className="w-[7%]" />{/* City */}
                <col className="w-[8%]" />{/* Category */}
                <col className="w-[10%]" />{/* Status */}
                <col className="w-[7%]" />{/* Outreach */}
                <col className="w-[10%]" />{/* Assigned To */}
                <col className="w-[7%]" />{/* Last Contact */}
                <col className="w-[7%]" />{/* Added */}
                <col className="w-[6%]" />{/* Actions */}
              </colgroup>
              <thead>
                <tr className="border-b border-tastelanc-surface-light bg-tastelanc-surface/50">
                  <SortHeader column="business_name" label="Business" />
                  <SortHeader column="contact_name" label="Contact" />
                  <SortHeader column={null} label="Phone" />
                  <SortHeader column="city" label="City" />
                  <SortHeader column="category" label="Category" />
                  <SortHeader column="status" label="Status" />
                  <SortHeader column={null} label="Outreach" />
                  <SortHeader column={null} label="Rep" />
                  <SortHeader column="last_contacted_at" label="Last" />
                  <SortHeader column="created_at" label="Added" />
                  <SortHeader column={null} label="" className="text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-tastelanc-surface-light">
                {filteredLeads.map((lead) => {
                  const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                  const isOtherRepsLead = lead.assigned_to && lead.assigned_to !== currentUserId;
                  const aging = isOtherRepsLead ? getLeadAge(lead) : null;
                  const isLocked = !isAdmin && isOtherRepsLead && aging && !aging.isStale;

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-tastelanc-surface-light/30 transition-colors"
                    >
                      {/* Business */}
                      <td className={`${tdClass} overflow-hidden`}>
                        <Link
                          href={`/sales/leads/${lead.id}`}
                          className="font-medium text-white hover:text-tastelanc-accent transition-colors truncate flex items-center gap-1.5"
                          title={lead.business_name}
                        >
                          {lead.has_unread_replies && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" title="Unread reply" />
                          )}
                          <span className="truncate">{lead.business_name}</span>
                        </Link>
                      </td>

                      {/* Contact */}
                      <td className={`${tdClass} overflow-hidden`}>
                        <div className="truncate">
                          {lead.contact_name && (
                            <span className="text-white" title={lead.contact_name}>{lead.contact_name}</span>
                          )}
                          {lead.email && (
                            <div className="text-xs text-gray-500 truncate" title={lead.email}>{lead.email}</div>
                          )}
                          {!lead.contact_name && !lead.email && (
                            <span className="text-gray-600">—</span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className={`${tdClass} overflow-hidden`}>
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="text-gray-300 hover:text-white truncate block" title={lead.phone}>
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* City */}
                      <td className={`${tdClass} text-gray-400`}>
                        {lead.city || <span className="text-gray-600">—</span>}
                      </td>

                      {/* Category */}
                      <td className={tdClass}>
                        {lead.category ? (
                          <span className="text-xs text-gray-400 capitalize">
                            {lead.category.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className={`${tdClass} overflow-hidden`}>
                        {isLocked ? (
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                        ) : (
                          <select
                            value={lead.status}
                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                            className={`w-full px-2 py-1 rounded text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-tastelanc-accent ${statusConfig.color}`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="interested">Interested</option>
                            <option value="not_interested">Not Interested</option>
                            <option value="converted">Converted</option>
                          </select>
                        )}
                      </td>

                      {/* Outreach */}
                      <td className={tdClass}>
                        {lead.activity_types && lead.activity_types.length > 0 ? (
                          <div className="flex items-center gap-1">
                            {Object.entries(ACTIVITY_ICONS).map(([type, config]) => {
                              const Icon = config.icon;
                              const done = lead.activity_types.includes(type);
                              if (!done) return null;
                              return (
                                <span
                                  key={type}
                                  title={config.label}
                                  className={`${config.color}`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Assigned To */}
                      <td className={`${tdClass} overflow-hidden`}>
                        {lead.assigned_to_name ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-gray-300 truncate block" title={lead.assigned_to_name}>
                              {lead.assigned_to === currentUserId ? (
                                <span className="text-white">{lead.assigned_to_name}</span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  {(() => {
                                    const aging = getLeadAge(lead);
                                    return aging.isStale ? (
                                      <Unlock className="w-3 h-3 text-green-400 flex-shrink-0" />
                                    ) : (
                                      <Lock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                    );
                                  })()}
                                  <span className="truncate">{lead.assigned_to_name}</span>
                                </span>
                              )}
                            </span>
                            {lead.assigned_to === currentUserId && (() => {
                              const aging = getLeadAge(lead);
                              if (aging.isNudge && !aging.isStale) {
                                return (
                                  <span className="flex items-center gap-0.5 text-[10px] text-yellow-400">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Follow up
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Last Contact */}
                      <td className={`${tdClass} text-gray-400`}>
                        {lead.last_contacted_at ? (
                          formatRelativeDate(lead.last_contacted_at)
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>

                      {/* Added */}
                      <td className={`${tdClass} text-gray-500`} title={formatDate(lead.created_at)}>
                        {formatShortDate(lead.created_at)}
                      </td>

                      {/* Actions */}
                      <td className={`${tdClass} text-right overflow-hidden`}>
                        <div className="flex items-center justify-end gap-1">
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="p-1 text-gray-500 hover:text-white rounded transition-colors"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <Link
                            href={`/sales/checkout?email=${encodeURIComponent(lead.email || '')}&name=${encodeURIComponent(lead.contact_name || lead.business_name)}&phone=${encodeURIComponent(lead.phone || '')}&businessName=${encodeURIComponent(lead.business_name)}`}
                            className="p-1 text-green-500 hover:text-green-400 rounded transition-colors"
                            title="Create Sale"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </Link>
                          <Link
                            href={`/sales/leads/${lead.id}`}
                            className="p-1 text-gray-500 hover:text-tastelanc-accent rounded transition-colors"
                            title="View Details"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-tastelanc-surface-light">
              <span className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-tastelanc-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 1)
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="px-1 text-gray-600">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => goToPage(item as number)}
                        className={`min-w-[28px] h-7 rounded text-sm font-medium transition-colors ${
                          pagination.page === item
                            ? 'bg-tastelanc-accent text-white'
                            : 'text-gray-400 hover:text-white hover:bg-tastelanc-surface-light'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-tastelanc-surface-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      );
      })()}
    </div>
  );
}
