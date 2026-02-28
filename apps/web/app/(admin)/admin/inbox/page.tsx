'use client';

import { useState, useEffect } from 'react';
import {
  Inbox,
  Search,
  Loader2,
  Mail,
  MailOpen,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import InboxEmailCard from '@/components/admin/InboxEmailCard';
import type { InboundEmail } from '@/lib/ai/expansion-types';

export default function AdminInboxPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    fetchEmails();
  }, [categoryFilter, readFilter, showArchived]);

  async function fetchEmails() {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (readFilter !== 'all') params.set('is_read', readFilter);
      if (showArchived) params.set('is_archived', 'true');
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/admin/inbox?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch inbox');
      const data = await res.json();
      setEmails(data.emails || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching inbox:', error);
      toast.error('Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: string) {
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_read: true }),
      });
      if (!res.ok) throw new Error('Failed to mark as read');
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, is_read: true } : e))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  async function handleArchive(id: string) {
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_archived: true }),
      });
      if (!res.ok) throw new Error('Failed to archive');
      setEmails((prev) => prev.filter((e) => e.id !== id));
      toast.success('Email archived');
    } catch (error) {
      toast.error('Failed to archive email');
    }
  }

  async function handleCategoryChange(id: string, category: string) {
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, category }),
      });
      if (!res.ok) throw new Error('Failed to update category');
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, category: category as InboundEmail['category'] } : e))
      );
    } catch (error) {
      toast.error('Failed to update category');
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    fetchEmails();
  }

  const filteredEmails = searchQuery
    ? emails.filter((e) => {
        const q = searchQuery.toLowerCase();
        return (
          e.from_email.toLowerCase().includes(q) ||
          (e.from_name || '').toLowerCase().includes(q) ||
          (e.subject || '').toLowerCase().includes(q)
        );
      })
    : emails;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-tastelanc-accent" />
            Inbox
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-sm rounded-full bg-tastelanc-accent text-white">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Incoming emails from info@tastelanc.com
          </p>
        </div>

        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            showArchived
              ? 'bg-tastelanc-accent text-white'
              : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
          }`}
        >
          <Archive className="w-4 h-4" />
          {showArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{emails.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-tastelanc-accent/20 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-tastelanc-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{unreadCount}</p>
              <p className="text-xs text-gray-500">Unread</p>
            </div>
          </div>
        </div>
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <MailOpen className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {emails.filter((e) => e.is_read).length}
              </p>
              <p className="text-xs text-gray-500">Read</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-tastelanc-accent"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setLoading(true); }}
          className="px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:border-tastelanc-accent"
        >
          <option value="all">All Categories</option>
          <option value="inquiry">Inquiry</option>
          <option value="lead">Lead</option>
          <option value="spam">Spam</option>
          <option value="other">Other</option>
        </select>
        <select
          value={readFilter}
          onChange={(e) => { setReadFilter(e.target.value); setLoading(true); }}
          className="px-3 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:border-tastelanc-accent"
        >
          <option value="all">All</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
      </form>

      {/* Email List */}
      {filteredEmails.length === 0 ? (
        <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {showArchived ? 'No archived emails.' : 'Inbox is empty.'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Emails forwarded from info@tastelanc.com will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredEmails.map((email) => (
            <InboxEmailCard
              key={email.id}
              email={email}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onCategoryChange={handleCategoryChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
