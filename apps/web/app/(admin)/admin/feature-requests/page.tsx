'use client';

import { useState, useEffect } from 'react';
import { Card, Badge } from '@/components/ui';
import { Lightbulb, Calendar, User, Trash2, Star, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureRequest {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  status: 'new' | 'reviewing' | 'planned' | 'in_progress' | 'completed' | 'declined';
  priority: number | null;
  admin_notes: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-500' },
  { value: 'reviewing', label: 'Reviewing', color: 'bg-yellow-500' },
  { value: 'planned', label: 'Planned', color: 'bg-purple-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-orange-500' },
  { value: 'completed', label: 'Completed', color: 'bg-green-500' },
  { value: 'declined', label: 'Declined', color: 'bg-gray-500' },
];

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'accent' | 'gold'> = {
  new: 'accent',
  reviewing: 'gold',
  planned: 'default',
  in_progress: 'gold',
  completed: 'default',
  declined: 'default',
};

export default function AdminFeatureRequestsPage() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/feature-requests');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError('Failed to load feature requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateRequest = async (id: string, updates: Partial<FeatureRequest>) => {
    setUpdatingId(id);
    try {
      const response = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update');
      const data = await response.json();
      setRequests(prev => prev.map(r => r.id === id ? data.request : r));
      toast.success('Updated');
    } catch (err) {
      console.error('Failed to update:', err);
      toast.error('Failed to update');
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature request?')) return;

    try {
      const response = await fetch(`/api/admin/feature-requests/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Deleted');
    } catch (err) {
      console.error('Failed to delete:', err);
      toast.error('Failed to delete');
    }
  };

  const markAsRead = async (id: string) => {
    await updateRequest(id, { read_at: new Date().toISOString() });
  };

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const unreadCount = requests.filter(r => !r.read_at).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-tastelanc-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <p className="text-red-400">{error}</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-7 h-7 text-tastelanc-accent" />
          Feature Requests
        </h1>
        <p className="text-gray-400 mt-1 text-sm md:text-base">
          {requests.length} total{unreadCount > 0 && ` (${unreadCount} new)`}
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
            statusFilter === 'all'
              ? 'bg-tastelanc-accent text-white'
              : 'bg-tastelanc-surface text-gray-400 hover:text-white'
          }`}
        >
          All ({requests.length})
        </button>
        {STATUS_OPTIONS.map(option => {
          const count = requests.filter(r => r.status === option.value).length;
          return (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                statusFilter === option.value
                  ? 'bg-tastelanc-accent text-white'
                  : 'bg-tastelanc-surface text-gray-400 hover:text-white'
              }`}
            >
              {option.label} ({count})
            </button>
          );
        })}
      </div>

      {filteredRequests.length === 0 ? (
        <Card className="p-8 md:p-12 text-center">
          <MessageSquare className="w-10 h-10 md:w-12 md:h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-base md:text-lg font-medium text-white mb-2">No feature requests</h3>
          <p className="text-gray-400 text-sm md:text-base">
            {statusFilter === 'all'
              ? "When users submit feature requests, they'll appear here."
              : `No ${statusFilter} requests found.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              className={`p-4 md:p-6 ${!request.read_at ? 'ring-1 ring-tastelanc-accent/50' : ''}`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-tastelanc-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-tastelanc-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{request.title}</h3>
                      {!request.read_at && (
                        <Badge variant="accent" className="text-xs">New</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 text-xs mt-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(request.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        timeZone: 'America/New_York',
                      })}
                      {request.user_id && (
                        <>
                          <span className="mx-1">•</span>
                          <User className="w-3 h-3" />
                          <span>{request.user_id.slice(0, 8)}...</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteRequest(request.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="bg-tastelanc-surface-light/50 rounded-lg p-3 md:p-4 mb-4">
                <p className="text-gray-300 whitespace-pre-wrap text-sm md:text-base">
                  {request.description}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Status:</span>
                  <select
                    value={request.status}
                    onChange={(e) => updateRequest(request.id, { status: e.target.value as any })}
                    disabled={updatingId === request.id}
                    className="bg-tastelanc-surface border border-tastelanc-surface-light rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-tastelanc-accent"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Priority:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => updateRequest(request.id, { priority: star })}
                        disabled={updatingId === request.id}
                        className="p-0.5 transition-colors"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            request.priority && star <= request.priority
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mark as Read */}
                {!request.read_at && (
                  <button
                    onClick={() => markAsRead(request.id)}
                    disabled={updatingId === request.id}
                    className="text-sm text-tastelanc-accent hover:underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>

              {/* Admin Notes Input */}
              <div className="mt-4">
                <textarea
                  placeholder="Add admin notes..."
                  value={request.admin_notes || ''}
                  onChange={(e) => {
                    // Local update only
                    setRequests(prev => prev.map(r =>
                      r.id === request.id ? { ...r, admin_notes: e.target.value } : r
                    ));
                  }}
                  onBlur={(e) => {
                    // Save on blur
                    if (e.target.value !== request.admin_notes) {
                      updateRequest(request.id, { admin_notes: e.target.value || null });
                    }
                  }}
                  className="w-full bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-3 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-tastelanc-accent resize-none"
                  rows={2}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
