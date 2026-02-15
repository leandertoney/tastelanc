'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Briefcase,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

interface SalesRep {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  market_ids: string[];
  is_active: boolean;
  created_at: string;
  lead_count: number;
}

export default function AdminSalesRepsPage() {
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const fetchReps = async () => {
    try {
      const res = await fetch('/api/admin/sales-reps');
      const data = await res.json();
      setReps(data.reps || []);
    } catch (error) {
      console.error('Error fetching sales reps:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReps();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email) {
      setMessage({ type: 'error', text: 'Name and email are required' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/sales-reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create sales rep');
      }

      setMessage({ type: 'success', text: `Sales rep "${form.name}" created! Welcome email sent to ${form.email}.` });
      setForm({ name: '', email: '', phone: '' });
      setShowForm(false);
      fetchReps();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (repId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/sales-reps/${repId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (res.ok) {
        setReps((prev) =>
          prev.map((rep) =>
            rep.id === repId ? { ...rep, is_active: !currentActive } : rep
          )
        );
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-tastelanc-accent" />
            Sales Reps
          </h1>
          <p className="text-gray-400 mt-1">Manage your sales team accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sales Rep
        </button>
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

      {/* Create Form */}
      {showForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create Sales Rep Account</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="rep@example.com"
                  className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(717) 555-0123"
                  className="w-full px-4 py-2.5 bg-tastelanc-surface-light border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create & Send Invite
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 bg-tastelanc-surface-light text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
        </div>
      ) : reps.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No sales reps yet</h3>
          <p className="text-gray-400 mb-4">Add your first sales team member</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Sales Rep
          </button>
        </Card>
      ) : (
        <div className="space-y-3">
          {reps.map((rep) => (
            <Card key={rep.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-white">{rep.name}</h3>
                    <Badge className={rep.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {rep.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {rep.email}
                    </span>
                    {rep.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {rep.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {rep.lead_count} leads
                    </span>
                    <span className="text-gray-600">
                      Joined {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(rep.id, rep.is_active)}
                    className={`px-4 py-1.5 rounded-lg text-sm transition-colors ${
                      rep.is_active
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    }`}
                  >
                    {rep.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
