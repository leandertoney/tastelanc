'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Trash2, Search, Loader2, Pencil, X, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import CsvImportModal from './CsvImportModal';

interface Contact {
  id: string;
  email: string;
  name: string | null;
  source: string;
  is_unsubscribed: boolean;
  created_at: string;
}

interface ContactStats {
  total: number;
  active: number;
  unsubscribed: number;
  contactLimit: number;
  tierName: string;
}

interface ContactsTabProps {
  restaurantId: string;
}

export default function ContactsTab({ restaurantId }: ContactsTabProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats>({ total: 0, active: 0, unsubscribed: 0, contactLimit: 0, tierName: '' });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        restaurant_id: restaurantId,
        page: String(page),
        limit: '50',
        show_unsubscribed: 'true',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/dashboard/marketing/contacts?${params}`);
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, page, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/marketing/contacts/stats?restaurant_id=${restaurantId}`);
      const data = await res.json();
      if (res.ok) setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [fetchContacts, fetchStats]);

  const handleAdd = async () => {
    if (!newEmail) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/dashboard/marketing/contacts?restaurant_id=${restaurantId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName || null }),
      });
      if (res.ok) {
        setNewEmail('');
        setNewName('');
        setShowAddForm(false);
        fetchContacts();
        fetchStats();
      }
    } catch (err) {
      console.error('Error adding contact:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id: string) => {
    try {
      const res = await fetch(
        `/api/dashboard/marketing/contacts/${id}?restaurant_id=${restaurantId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: editEmail, name: editName || null }),
        }
      );
      if (res.ok) {
        setEditingId(null);
        fetchContacts();
      }
    } catch (err) {
      console.error('Error editing contact:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(
        `/api/dashboard/marketing/contacts/${id}?restaurant_id=${restaurantId}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        fetchContacts();
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-tastelanc-surface-light rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-tastelanc-text-primary">
            {stats.total}
            {stats.contactLimit > 0 && (
              <span className="text-sm font-normal text-tastelanc-text-faint"> / {stats.contactLimit}</span>
            )}
          </p>
          <p className="text-xs text-tastelanc-text-muted mt-1">Total Contacts</p>
        </div>
        {[
          { label: 'Active', value: stats.active },
          { label: 'Unsubscribed', value: stats.unsubscribed },
        ].map((stat) => (
          <div key={stat.label} className="bg-tastelanc-surface-light rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-tastelanc-text-primary">{stat.value}</p>
            <p className="text-xs text-tastelanc-text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      {restaurantId === '9d64d846-931a-4e1c-8d35-296b008f728e' && (
        <div className="bg-tastelanc-surface-light border border-yellow-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-lg">🎉</span>
          <p className="text-sm text-tastelanc-text-muted">
            <span className="font-medium text-yellow-400">Elite promotion active</span> — you&apos;ve been upgraded to a 5,000 contact limit. Enjoy!
          </p>
        </div>
      )}
      {stats.contactLimit > 0 && stats.total >= stats.contactLimit && (
        <p className="text-xs text-yellow-400">
          Contact limit reached ({stats.contactLimit} for {stats.tierName} tier). Remove contacts or upgrade to add more.
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => setShowImport(true)}
          className="bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-tastelanc-text-primary"
        >
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-tastelanc-text-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Contact
        </Button>
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="bg-tastelanc-surface-light rounded-lg p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-tastelanc-text-muted mb-1 block">Email *</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-tastelanc-text-muted mb-1 block">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-tastelanc-bg border border-tastelanc-border rounded-lg px-3 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent"
            />
          </div>
          <Button
            onClick={handleAdd}
            disabled={!newEmail || adding}
            className="bg-tastelanc-accent hover:bg-tastelanc-accent/80 text-tastelanc-text-primary disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </Button>
          <button onClick={() => setShowAddForm(false)} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary p-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tastelanc-text-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search contacts..."
          className="w-full bg-tastelanc-surface-light border border-tastelanc-border rounded-lg pl-10 pr-4 py-2 text-tastelanc-text-primary text-sm focus:outline-none focus:border-tastelanc-accent"
        />
      </div>

      {/* Contact List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-tastelanc-text-faint animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-tastelanc-text-muted">No contacts yet. Import a CSV or add contacts manually.</p>
        </div>
      ) : (
        <div className="bg-tastelanc-surface-light rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-tastelanc-border">
                <th className="text-left text-xs text-tastelanc-text-muted font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-tastelanc-text-muted font-medium px-4 py-3">Email</th>
                <th className="text-left text-xs text-tastelanc-text-muted font-medium px-4 py-3 hidden sm:table-cell">Source</th>
                <th className="text-left text-xs text-tastelanc-text-muted font-medium px-4 py-3 hidden md:table-cell">Status</th>
                <th className="text-right text-xs text-tastelanc-text-muted font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className="border-b border-tastelanc-border/50 last:border-0">
                  {editingId === contact.id ? (
                    <>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-tastelanc-bg border border-tastelanc-border rounded px-2 py-1 text-tastelanc-text-primary text-sm w-full"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="bg-tastelanc-bg border border-tastelanc-border rounded px-2 py-1 text-tastelanc-text-primary text-sm w-full"
                        />
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" />
                      <td className="px-4 py-3 hidden md:table-cell" />
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleEdit(contact.id)} className="text-green-400 hover:text-green-300 mr-2">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-tastelanc-text-muted hover:text-tastelanc-text-primary">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-tastelanc-text-primary">{contact.name || '—'}</td>
                      <td className="px-4 py-3 text-sm text-tastelanc-text-secondary">{contact.email}</td>
                      <td className="px-4 py-3 text-xs text-tastelanc-text-faint hidden sm:table-cell capitalize">
                        {contact.source.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {contact.is_unsubscribed ? (
                          <span className="text-xs text-red-400">Unsubscribed</span>
                        ) : (
                          <span className="text-xs text-green-400">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingId(contact.id);
                            setEditEmail(contact.email);
                            setEditName(contact.name || '');
                          }}
                          className="text-tastelanc-text-muted hover:text-tastelanc-text-primary mr-2"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleting === contact.id}
                          className="text-tastelanc-text-muted hover:text-red-400"
                        >
                          {deleting === contact.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-tastelanc-text-primary text-sm disabled:opacity-50"
          >
            Previous
          </Button>
          <span className="text-sm text-tastelanc-text-muted flex items-center px-3">
            Page {page} of {totalPages}
          </span>
          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="bg-tastelanc-surface hover:bg-tastelanc-surface-light text-tastelanc-text-primary text-sm disabled:opacity-50"
          >
            Next
          </Button>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImport && (
        <CsvImportModal
          restaurantId={restaurantId}
          onClose={() => setShowImport(false)}
          onSuccess={() => { fetchContacts(); fetchStats(); }}
        />
      )}
    </div>
  );
}
