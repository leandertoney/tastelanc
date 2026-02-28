'use client';

import { useState, useEffect } from 'react';
import {
  Mail,
  Phone,
  Loader2,
  MessageSquare,
  ArrowRight,
  Users,
  Search,
  Eye,
  EyeOff,
  CheckSquare,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { toast } from 'sonner';

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  business_name: string | null;
  message: string | null;
  interested_plan: string | null;
  created_at: string;
  read_at: string | null;
  responded_at: string | null;
}

type StatusFilter = 'all' | 'unread' | 'read' | 'converted';

export default function SalesContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkConverting, setIsBulkConverting] = useState(false);

  const fetchContacts = async () => {
    setFetchError(false);
    try {
      const res = await fetch('/api/sales/contacts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setFetchError(true);
      toast.error('Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleConvert = async (contactId: string) => {
    setConvertingId(contactId);

    try {
      const res = await fetch(`/api/sales/contacts/${contactId}/convert`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to convert');
      }

      toast.success(`Converted to lead: ${data.lead.business_name}`);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, responded_at: new Date().toISOString() } : c
        )
      );
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(contactId); return next; });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to convert contact';
      toast.error(msg);
    } finally {
      setConvertingId(null);
    }
  };

  const handleMarkRead = (contactId: string) => {
    // Mark as read locally (no API endpoint yet — visual only)
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId && !c.read_at ? { ...c, read_at: new Date().toISOString() } : c
      )
    );
  };

  const handleBulkConvert = async () => {
    const ids = Array.from(selectedIds).filter(
      (id) => !contacts.find((c) => c.id === id)?.responded_at
    );
    if (ids.length === 0) return;

    setIsBulkConverting(true);
    let successCount = 0;

    for (const id of ids) {
      try {
        const res = await fetch(`/api/sales/contacts/${id}/convert`, { method: 'POST' });
        if (res.ok) {
          successCount++;
          setContacts((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, responded_at: new Date().toISOString() } : c
            )
          );
        }
      } catch {
        // continue with others
      }
    }

    setSelectedIds(new Set());
    setIsBulkConverting(false);
    toast.success(`Converted ${successCount} of ${ids.length} contacts`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  };

  // Filtering
  const filteredContacts = contacts.filter((c) => {
    // Status filter
    if (statusFilter === 'unread' && c.read_at) return false;
    if (statusFilter === 'read' && !c.read_at) return false;
    if (statusFilter === 'converted' && !c.responded_at) return false;

    // Search
    if (search) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.business_name || '').toLowerCase().includes(q) ||
        (c.message || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const unreadCount = contacts.filter((c) => !c.read_at).length;
  const convertedCount = contacts.filter((c) => c.responded_at).length;
  const unconvertedSelected = Array.from(selectedIds).filter(
    (id) => !contacts.find((c) => c.id === id)?.responded_at
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  if (fetchError && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <Mail className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">Couldn&apos;t load contacts</h2>
          <p className="text-gray-400 text-sm mb-6">
            We had trouble fetching contact inquiries. Please try again.
          </p>
          <button
            onClick={fetchContacts}
            className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Mail className="w-8 h-8 text-tastelanc-accent" />
            Contact Inquiries
          </h1>
          <p className="text-gray-400 mt-1">
            {contacts.length} total{unreadCount > 0 && ` · ${unreadCount} unread`} · {convertedCount} converted
          </p>
        </div>
        {unconvertedSelected > 0 && (
          <button
            onClick={handleBulkConvert}
            disabled={isBulkConverting}
            className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isBulkConverting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckSquare className="w-4 h-4" />
            )}
            Convert {unconvertedSelected} Selected
          </button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-3 mb-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            />
          </div>
          <div className="flex gap-2">
            {([
              { value: 'all' as const, label: 'All' },
              { value: 'unread' as const, label: 'Unread' },
              { value: 'read' as const, label: 'Read' },
              { value: 'converted' as const, label: 'Converted' },
            ]).map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-tastelanc-accent text-white'
                    : 'bg-tastelanc-surface-light text-gray-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            {contacts.length === 0 ? 'No inquiries yet' : 'No matching inquiries'}
          </h3>
          <p className="text-gray-400">
            {contacts.length === 0
              ? 'Contact form submissions will appear here'
              : 'Try adjusting your search or filters'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-3 px-2">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                selectedIds.size === filteredContacts.length && filteredContacts.length > 0
                  ? 'bg-tastelanc-accent border-tastelanc-accent'
                  : 'border-gray-600'
              }`}>
                {selectedIds.size === filteredContacts.length && filteredContacts.length > 0 && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12"><path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                )}
              </div>
              Select All
            </button>
          </div>

          {filteredContacts.map((contact) => {
            const isUnread = !contact.read_at;
            const isConverted = !!contact.responded_at;
            const isSelected = selectedIds.has(contact.id);

            return (
              <Card
                key={contact.id}
                className={`p-4 transition-colors ${isUnread ? 'ring-1 ring-tastelanc-accent/30 bg-tastelanc-accent/5' : ''}`}
                onClick={() => handleMarkRead(contact.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(contact.id); }}
                    className="mt-1 flex-shrink-0"
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-tastelanc-accent border-tastelanc-accent' : 'border-gray-600 hover:border-gray-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12"><path d="M10 3L4.5 8.5 2 6" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                      )}
                    </div>
                  </button>

                  {/* Unread indicator */}
                  <div className="mt-2 flex-shrink-0">
                    {isUnread ? (
                      <div className="w-2 h-2 rounded-full bg-tastelanc-accent" title="Unread" />
                    ) : (
                      <div className="w-2 h-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className={`font-semibold ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                        {contact.business_name || contact.name}
                      </h3>
                      {contact.interested_plan && (
                        <Badge className="bg-lancaster-gold/20 text-lancaster-gold text-xs">
                          {contact.interested_plan}
                        </Badge>
                      )}
                      {isConverted && (
                        <Badge className="bg-green-500/20 text-green-400 text-xs">Converted</Badge>
                      )}
                      <span className="text-xs text-gray-600 ml-auto flex-shrink-0">
                        {new Date(contact.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-400 mb-1.5">
                      <span>{contact.name}</span>
                      <span className="text-gray-600">·</span>
                      <span className="truncate">{contact.email}</span>
                    </div>

                    {contact.message && (
                      <p className={`text-sm line-clamp-2 ${isUnread ? 'text-gray-300' : 'text-gray-500'}`}>
                        {contact.message}
                      </p>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-500 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
                      title="Send Email"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-500 hover:text-white hover:bg-tastelanc-surface-light rounded-lg transition-colors"
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {!isConverted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConvert(contact.id); }}
                        disabled={convertingId === contact.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        {convertingId === contact.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <ArrowRight className="w-3.5 h-3.5" />
                            Convert
                          </>
                        )}
                      </button>
                    )}
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
