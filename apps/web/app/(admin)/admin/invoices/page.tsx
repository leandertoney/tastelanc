'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Mail, TrendingDown, RefreshCw, DollarSign, Clock, XCircle } from 'lucide-react';

interface InvoiceRow {
  id: string;
  stripe_invoice_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  invoice_url: string | null;
  reminders_sent: number;
  last_reminder_at: string | null;
  downgraded_at: string | null;
  notes: string | null;
  created_at: string;
  restaurant: {
    id: string;
    name: string;
    contact_email: string | null;
    contact_name: string | null;
    tier: string | null;
    market: string | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  past_due: 'bg-red-500/15 text-red-400 border border-red-500/30',
  downgraded: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
  paid: 'bg-green-500/15 text-green-400 border border-green-500/30',
  void: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
  uncollectible: 'bg-gray-500/15 text-gray-400 border border-gray-500/30',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  past_due: 'Past Due',
  downgraded: 'Downgraded',
  paid: 'Paid',
  void: 'Voided',
  uncollectible: 'Uncollectible',
};

function formatAmount(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function daysOverdue(dueDateIso: string | null): number | null {
  if (!dueDateIso) return null;
  const due = new Date(dueDateIso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'outstanding' | 'all'>('outstanding');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleAction = async (invoiceId: string, action: 'downgrade' | 'remind' | 'resolve') => {
    setActionLoading(`${invoiceId}-${action}`);
    try {
      const res = await fetch(`/api/admin/invoices/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      showToast(data.message, 'success');
      await fetchInvoices();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const displayed = filter === 'outstanding'
    ? invoices.filter(i => ['open', 'past_due', 'downgraded'].includes(i.status))
    : invoices;

  const outstanding = invoices.filter(i => ['open', 'past_due', 'downgraded'].includes(i.status));
  const totalOutstanding = outstanding.reduce((sum, i) => sum + i.amount_cents, 0);
  const pastDue = invoices.filter(i => i.status === 'past_due' || i.status === 'downgraded');

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Invoice Tracker</h1>
          <p className="text-gray-400 mt-1">Monitor outstanding invoices and manage restaurant tiers</p>
        </div>
        <button onClick={fetchInvoices} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/15 rounded-lg"><DollarSign size={18} className="text-yellow-400" /></div>
            <span className="text-gray-400 text-sm">Total Outstanding</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatAmount(totalOutstanding, 'usd')}</p>
          <p className="text-xs text-gray-500 mt-1">{outstanding.length} invoice{outstanding.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/15 rounded-lg"><AlertCircle size={18} className="text-red-400" /></div>
            <span className="text-gray-400 text-sm">Past Due / Downgraded</span>
          </div>
          <p className="text-2xl font-bold text-white">{pastDue.length}</p>
          <p className="text-xs text-gray-500 mt-1">Require immediate action</p>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-white/10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/15 rounded-lg"><CheckCircle size={18} className="text-green-400" /></div>
            <span className="text-gray-400 text-sm">Paid This Month</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {invoices.filter(i => i.status === 'paid' && i.paid_at && new Date(i.paid_at) > new Date(Date.now() - 30 * 86400000)).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['outstanding', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-white text-black' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
          >
            {f === 'outstanding' ? `Outstanding (${outstanding.length})` : `All (${invoices.length})`}
          </button>
        ))}
      </div>

      {/* Invoice table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" />
          Loading invoices...
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <CheckCircle size={40} className="text-green-400 mb-3" />
          <p className="text-lg font-medium text-white">All clear!</p>
          <p className="text-sm">No outstanding invoices.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((inv) => {
            const overdue = daysOverdue(inv.due_date);
            const isActioning = (action: string) => actionLoading === `${inv.id}-${action}`;
            const canDowngrade = ['open', 'past_due'].includes(inv.status);
            const canRemind = ['open', 'past_due', 'downgraded'].includes(inv.status);
            const canResolve = ['open', 'past_due', 'downgraded'].includes(inv.status);

            return (
              <div key={inv.id} className="bg-[#1a1a1a] rounded-xl border border-white/10 p-5">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* Left: restaurant info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="font-semibold text-white text-lg leading-tight">{inv.restaurant.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[inv.status] || STATUS_COLORS['open']}`}>
                        {STATUS_LABELS[inv.status] || inv.status}
                      </span>
                      {inv.restaurant.tier && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-300">
                          {inv.restaurant.tier.charAt(0).toUpperCase() + inv.restaurant.tier.slice(1)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Amount</span>
                        <p className="text-white font-semibold">{formatAmount(inv.amount_cents, inv.currency)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Due</span>
                        <p className={`font-medium ${overdue ? 'text-red-400' : 'text-white'}`}>
                          {formatDate(inv.due_date)}
                          {overdue && <span className="ml-1 text-xs">({overdue}d overdue)</span>}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Contact</span>
                        <p className="text-white">{inv.restaurant.contact_name || '—'}</p>
                        {inv.restaurant.contact_email && (
                          <p className="text-gray-400 text-xs truncate">{inv.restaurant.contact_email}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-500">Reminders</span>
                        <p className="text-white flex items-center gap-1">
                          {inv.reminders_sent}
                          {inv.last_reminder_at && (
                            <span className="text-gray-500 text-xs flex items-center gap-1">
                              <Clock size={10} /> {formatDate(inv.last_reminder_at)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {inv.downgraded_at && (
                      <p className="text-orange-400 text-xs mt-2 flex items-center gap-1">
                        <TrendingDown size={12} /> Downgraded {formatDate(inv.downgraded_at)} — tier will auto-restore on payment
                      </p>
                    )}
                    {inv.notes && <p className="text-gray-400 text-xs mt-1 italic">"{inv.notes}"</p>}
                  </div>

                  {/* Right: actions */}
                  <div className="flex flex-row md:flex-col gap-2 flex-shrink-0">
                    {inv.invoice_url && (
                      <a
                        href={inv.invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-gray-300 transition-colors text-center"
                      >
                        View Invoice ↗
                      </a>
                    )}
                    {canRemind && (
                      <button
                        onClick={() => handleAction(inv.id, 'remind')}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 rounded-lg text-xs font-medium text-blue-300 transition-colors disabled:opacity-50"
                      >
                        {isActioning('remind') ? <RefreshCw size={12} className="animate-spin" /> : <Mail size={12} />}
                        Send Reminder
                      </button>
                    )}
                    {canDowngrade && (
                      <button
                        onClick={() => handleAction(inv.id, 'downgrade')}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/40 border border-orange-500/30 rounded-lg text-xs font-medium text-orange-300 transition-colors disabled:opacity-50"
                      >
                        {isActioning('downgrade') ? <RefreshCw size={12} className="animate-spin" /> : <TrendingDown size={12} />}
                        Downgrade
                      </button>
                    )}
                    {canResolve && (
                      <button
                        onClick={() => handleAction(inv.id, 'resolve')}
                        disabled={!!actionLoading}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 rounded-lg text-xs font-medium text-green-300 transition-colors disabled:opacity-50"
                      >
                        {isActioning('resolve') ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
