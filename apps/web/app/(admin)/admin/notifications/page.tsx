'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, X, RefreshCw, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScheduledNotification {
  id: string;
  market_id: string;
  market_slug: string;
  scheduled_date: string;
  title: string;
  body: string;
  data_payload: Record<string, unknown>;
  restaurant_id: string | null;
  restaurant_name: string;
  strategy: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'sent' | 'skipped';
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  generated_at: string;
  sent_at: string | null;
  generation_attempt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MARKET_LABELS: Record<string, string> = {
  'lancaster-pa': 'Lancaster',
  'cumberland-pa': 'Cumberland',
  'fayetteville-nc': 'Fayetteville',
};

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function StatusBadge({ status }: { status: ScheduledNotification['status'] }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    sent: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    skipped: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  };
  const labels: Record<string, string> = {
    pending: '🟡 Pending',
    approved: '✅ Approved',
    rejected: '❌ Rejected',
    sent: '✉️ Sent',
    skipped: '⏭️ Skipped',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────

function RejectModal({
  notification,
  onConfirm,
  onCancel,
  loading,
}: {
  notification: ScheduledNotification;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-1">Reject notification</h3>
        <p className="text-sm text-zinc-400 mb-4">
          {notification.restaurant_name} · {formatDate(notification.scheduled_date)}
        </p>
        <textarea
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
          rows={3}
          placeholder="Optional: reason for rejection"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <p className="text-xs text-zinc-500 mt-2 mb-4">
          A replacement notification will be generated automatically.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reject & Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function NotificationRow({
  notification,
  onApprove,
  onReject,
  onRegenerate,
  actionLoading,
  checked,
  onToggleCheck,
}: {
  notification: ScheduledNotification;
  onApprove: (id: string) => void;
  onReject: (n: ScheduledNotification) => void;
  onRegenerate: (id: string) => void;
  actionLoading: string | null;
  checked: boolean;
  onToggleCheck: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = actionLoading === notification.id;
  return (
    <>
      <tr
        className="border-b border-zinc-800/50 hover:bg-zinc-800/20 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          {notification.status === 'pending' && (
            <input
              type="checkbox"
              className="rounded border-zinc-600 bg-zinc-800 text-yellow-500 cursor-pointer"
              checked={checked}
              onChange={onToggleCheck}
            />
          )}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">
          {formatDate(notification.scheduled_date)}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-400 capitalize">
          {MARKET_LABELS[notification.market_slug] ?? notification.market_slug}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-200 font-medium">
          {notification.restaurant_name}
        </td>
        <td className="px-4 py-3 text-sm text-zinc-400 max-w-xs truncate">
          {notification.title}
        </td>
        <td className="px-4 py-3">
          <StatusBadge status={notification.status} />
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            {notification.status === 'pending' && (
              <>
                <button
                  onClick={() => onApprove(notification.id)}
                  disabled={isLoading}
                  title="Approve"
                  className="p-1.5 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-400 disabled:opacity-40 transition-colors"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => onReject(notification)}
                  disabled={isLoading}
                  title="Reject"
                  className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}
            {notification.status === 'rejected' && (
              <button
                onClick={() => onRegenerate(notification.id)}
                disabled={isLoading}
                title="Regenerate"
                className="p-1.5 rounded-md bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 disabled:opacity-40 transition-colors flex items-center gap-1 text-xs px-2"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerate
              </button>
            )}
            {notification.status === 'approved' && (
              <button
                onClick={() => onReject(notification)}
                disabled={isLoading}
                title="Revoke approval"
                className="p-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </td>
        <td className="px-2 py-3 text-zinc-600">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-zinc-900/50 border-b border-zinc-800/50">
          <td colSpan={8} className="px-6 py-4">
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-zinc-500 text-xs uppercase tracking-wider">Title</span>
                <p className="text-white mt-0.5">{notification.title}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-xs uppercase tracking-wider">Body</span>
                <p className="text-zinc-300 mt-0.5 leading-relaxed">{notification.body}</p>
              </div>
              <div className="flex gap-6">
                {notification.strategy && (
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Strategy</span>
                    <p className="text-zinc-400 mt-0.5 capitalize">{notification.strategy}</p>
                  </div>
                )}
                <div>
                  <span className="text-zinc-500 text-xs uppercase tracking-wider">Generated</span>
                  <p className="text-zinc-400 mt-0.5">
                    {new Date(notification.generated_at).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
                    {notification.generation_attempt > 1 && (
                      <span className="ml-2 text-yellow-500/80 text-xs">(attempt {notification.generation_attempt})</span>
                    )}
                  </p>
                </div>
                {notification.rejection_reason && (
                  <div>
                    <span className="text-zinc-500 text-xs uppercase tracking-wider">Rejection reason</span>
                    <p className="text-red-400 mt-0.5">{notification.rejection_reason}</p>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ViewMode = 'upcoming' | 'history';
type MarketFilter = 'all' | 'lancaster-pa' | 'cumberland-pa' | 'fayetteville-nc';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [marketFilter, setMarketFilter] = useState<MarketFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState<ScheduledNotification | null>(null);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayET = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

      let fromDate: string;
      let toDate: string;
      if (viewMode === 'upcoming') {
        fromDate = todayET;
        toDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      } else {
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
        toDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      }

      const params = new URLSearchParams({ from_date: fromDate, to_date: toDate });
      if (marketFilter !== 'all') params.set('market_slug', marketFilter);

      const res = await fetch(`/api/admin/notifications?${params}`);
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (err) {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [viewMode, marketFilter]);

  useEffect(() => {
    fetchNotifications();
    setSelectedIds(new Set());
  }, [fetchNotifications]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected', rejectionReason?: string) => {
    const res = await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, rejection_reason: rejectionReason }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed');
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      await updateStatus(id, 'approved');
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, status: 'approved' } : n));
      showToast('Notification approved');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectModal) return;
    setRejectLoading(true);
    try {
      await updateStatus(rejectModal.id, 'rejected', reason);
      // Optimistically mark rejected; regeneration runs in background
      setNotifications((prev) =>
        prev.map((n) => n.id === rejectModal.id ? { ...n, status: 'rejected', rejection_reason: reason } : n),
      );
      showToast('Rejected — generating replacement…');
      setRejectModal(null);
      // Refresh after a short delay so replacement row appears
      setTimeout(fetchNotifications, 3000);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  const handleRegenerate = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/notifications/${id}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(data.newRestaurant ? `Regenerated: ${data.newRestaurant}` : 'Regenerated');
      fetchNotifications();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async () => {
    setBulkLoading(true);
    let ok = 0;
    for (const id of selectedIds) {
      try {
        await updateStatus(id, 'approved');
        ok++;
      } catch {}
    }
    setSelectedIds(new Set());
    fetchNotifications();
    showToast(`Approved ${ok} notification${ok !== 1 ? 's' : ''}`);
    setBulkLoading(false);
  };

  const handleGenerate = async () => {
    setGenerateLoading(true);
    try {
      const res = await fetch('/api/cron/pre-generate-notifications', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      showToast(`Generated ${data.generated} notification${data.generated !== 1 ? 's' : ''}`);
      fetchNotifications();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setGenerateLoading(false);
    }
  };

  // Summary counts
  const counts = notifications.reduce(
    (acc, n) => { acc[n.status] = (acc[n.status] ?? 0) + 1; return acc; },
    {} as Record<string, number>,
  );

  const pendingNotifications = notifications.filter((n) => n.status === 'pending');
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === pendingNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingNotifications.map((n) => n.id)));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-900 text-green-200 border border-green-700' : 'bg-red-900 text-red-200 border border-red-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <RejectModal
          notification={rejectModal}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectModal(null)}
          loading={rejectLoading}
        />
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Bell className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Notification Calendar</h1>
              <p className="text-sm text-zinc-500">Review and approve scheduled push notifications</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generateLoading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {generateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Generate Next 14 Days
          </button>
        </div>

        {/* Market Tabs */}
        <div className="flex gap-1 mb-4 bg-zinc-900 p-1 rounded-lg w-fit">
          {(['all', 'lancaster-pa', 'cumberland-pa', 'fayetteville-nc'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                marketFilter === m
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {m === 'all' ? 'All Markets' : MARKET_LABELS[m]}
            </button>
          ))}
        </div>

        {/* View Tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-800">
          {(['upcoming', 'history'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                viewMode === v
                  ? 'border-yellow-400 text-yellow-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {v === 'upcoming' ? 'Upcoming (14 days)' : 'History (past 7 days)'}
            </button>
          ))}
        </div>

        {/* Summary Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-5">
          {[
            { label: '✅ Approved', key: 'approved', color: 'text-green-400' },
            { label: '🟡 Pending', key: 'pending', color: 'text-yellow-400' },
            { label: '❌ Rejected', key: 'rejected', color: 'text-red-400' },
            { label: '✉️ Sent', key: 'sent', color: 'text-blue-400' },
            { label: '⏭️ Skipped', key: 'skipped', color: 'text-zinc-500' },
          ].map(({ label, key, color }) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <span className={`font-semibold ${color}`}>{counts[key] ?? 0}</span>
              <span className="text-zinc-500">{label}</span>
            </div>
          ))}
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Bulk Approve ({selectedIds.size})
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-500">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notifications found for this period.</p>
              <button
                onClick={handleGenerate}
                className="mt-4 text-sm text-yellow-400 hover:text-yellow-300 underline underline-offset-2"
              >
                Generate notifications →
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/80">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      className="rounded border-zinc-600 bg-zinc-800 text-yellow-500 cursor-pointer"
                      checked={pendingNotifications.length > 0 && selectedIds.size === pendingNotifications.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Market</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Restaurant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Preview</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Actions</th>
                  <th className="px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onApprove={handleApprove}
                    onReject={(notif) => setRejectModal(notif)}
                    onRegenerate={handleRegenerate}
                    actionLoading={actionLoading}
                    checked={selectedIds.has(n.id)}
                    onToggleCheck={() => toggleSelect(n.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
