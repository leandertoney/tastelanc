'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Loader2,
  Mail,
  Phone,
  Briefcase,
  Shield,
  MapPin,
  Edit2,
  X,
  Save,
  Crown,
  Plus,
  Filter,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  profileRole: 'super_admin' | 'co_founder' | 'market_admin' | null;
  adminMarketId: string | null;
  adminMarketName: string | null;
  isSalesRep: boolean;
  salesRepData: {
    market_ids: string[];
    is_active: boolean;
    phone: string | null;
    preferred_sender_name: string | null;
    preferred_sender_email: string | null;
  } | null;
  leadCount: number;
  marketNames: string[];
}

interface Market {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Owner', color: 'bg-purple-500/20 text-purple-400' },
  co_founder: { label: 'Co-Founder', color: 'bg-blue-500/20 text-blue-400' },
  market_admin: { label: 'Market Admin', color: 'bg-amber-500/20 text-amber-400' },
  sales_rep: { label: 'Sales Rep', color: 'bg-green-500/20 text-green-400' },
};

const ASSIGNABLE_ROLES = [
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'market_admin', label: 'Market Admin' },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    market_ids: [] as string[],
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Add member modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: 'sales_rep',
    phone: '',
    market_ids: [] as string[],
  });

  // Market filter
  const [filterMarketId, setFilterMarketId] = useState<string>('all');

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/admin/team');
      if (!res.ok) throw new Error('Failed to fetch team');
      const data = await res.json();
      setMembers(data.members || []);
      setMarkets(data.markets || []);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast.error('Failed to load team');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  // Filtered members
  const filteredMembers = useMemo(() => {
    if (filterMarketId === 'all') return members;
    return members.filter((m) => {
      // super_admin and co_founder are in all markets
      if (m.profileRole === 'super_admin' || m.profileRole === 'co_founder') return true;
      // Check sales rep market_ids
      if (m.salesRepData?.market_ids?.includes(filterMarketId)) return true;
      // Check admin market
      if (m.adminMarketId === filterMarketId) return true;
      return false;
    });
  }, [members, filterMarketId]);

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setEditForm({
      name: member.name || '',
      phone: member.salesRepData?.phone || '',
      market_ids: member.salesRepData?.market_ids || (member.adminMarketId ? [member.adminMarketId] : []),
      is_active: member.salesRepData?.is_active ?? true,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSave = async (memberId: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
          market_ids: editForm.market_ids,
          is_active: editForm.is_active,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }

      toast.success('Team member updated');
      setEditingId(null);
      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim().toLowerCase(),
          role: addForm.role,
          phone: addForm.phone.trim() || null,
          market_ids: addForm.market_ids,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add team member');
      }

      toast.success(`${addForm.name} added to the team`);
      setShowAddModal(false);
      setAddForm({ name: '', email: '', role: 'sales_rep', phone: '', market_ids: [] });
      fetchTeam();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add team member');
    } finally {
      setIsAdding(false);
    }
  };

  const toggleMarket = (marketId: string) => {
    setEditForm(prev => ({
      ...prev,
      market_ids: prev.market_ids.includes(marketId)
        ? prev.market_ids.filter(id => id !== marketId)
        : [...prev.market_ids, marketId],
    }));
  };

  const toggleAddMarket = (marketId: string) => {
    setAddForm(prev => ({
      ...prev,
      market_ids: prev.market_ids.includes(marketId)
        ? prev.market_ids.filter(id => id !== marketId)
        : [...prev.market_ids, marketId],
    }));
  };

  const getDisplayRole = (member: TeamMember) => {
    if (member.profileRole && ROLE_LABELS[member.profileRole]) {
      return ROLE_LABELS[member.profileRole];
    }
    if (member.isSalesRep) {
      return ROLE_LABELS.sales_rep;
    }
    return { label: 'Member', color: 'bg-gray-500/20 text-gray-400' };
  };

  const isProtected = (member: TeamMember) => {
    return member.profileRole === 'super_admin' || member.profileRole === 'co_founder';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-tastelanc-accent" />
            Team
          </h1>
          <p className="text-gray-400 mt-1">Manage roles and market assignments</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-white">{members.length}</p>
          <p className="text-xs text-gray-400 mt-1">Total Members</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {members.filter(m => m.salesRepData?.is_active !== false && !isProtected(m)).length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Active Reps</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">
            {members.reduce((sum, m) => sum + m.leadCount, 0)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Total Leads</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{markets.length}</p>
          <p className="text-xs text-gray-400 mt-1">Markets</p>
        </Card>
      </div>

      {/* Market filter */}
      {markets.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterMarketId}
            onChange={(e) => setFilterMarketId(e.target.value)}
            className="px-3 py-1.5 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
          >
            <option value="all">All Markets</option>
            {markets.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {filterMarketId !== 'all' && (
            <span className="text-xs text-gray-500">
              {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Team list */}
      <div className="space-y-3">
        {filteredMembers.map((member) => {
          const role = getDisplayRole(member);
          const isEditing = editingId === member.id;
          const locked = isProtected(member);

          return (
            <Card key={member.id} className="p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    {locked ? (
                      <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    ) : (
                      <Shield className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    )}
                    <h3 className="font-semibold text-white">{member.name}</h3>
                    <Badge className={role.color}>{role.label}</Badge>
                    {member.salesRepData && (
                      <Badge className={member.salesRepData.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {member.salesRepData.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {member.email}
                    </span>
                    {member.salesRepData?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {member.salesRepData.phone}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3" /> {member.leadCount} leads
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {member.marketNames.join(', ') || 'No market'}
                    </span>
                  </div>
                </div>

                {!locked && !isEditing && (
                  <button
                    onClick={() => startEdit(member)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-tastelanc-surface-light text-gray-300 hover:text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="mt-4 pt-4 border-t border-tastelanc-surface-light">
                  {/* Name & Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Full name"
                        className="w-full px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="w-full px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Market assignment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Market Assignment</label>
                      <div className="space-y-2">
                        {markets.map(market => (
                          <label
                            key={market.id}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={editForm.market_ids.includes(market.id)}
                              onChange={() => toggleMarket(market.id)}
                              className="rounded border-gray-600 bg-tastelanc-surface-light text-tastelanc-accent focus:ring-tastelanc-accent"
                            />
                            <span className="text-sm text-gray-300">{market.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                      <button
                        onClick={() => setEditForm(prev => ({ ...prev, is_active: !prev.is_active }))}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          editForm.is_active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {editForm.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleSave(member.id)}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 px-4 py-2 bg-tastelanc-surface-light text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Add Team Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-tastelanc-surface rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Add Team Member</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Jordan Smith"
                  className="w-full px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="jordan@tastelanc.com"
                  className="w-full px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full px-3 py-2 bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                >
                  {ASSIGNABLE_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Market Assignment</label>
                <div className="space-y-2">
                  {markets.map(market => (
                    <label
                      key={market.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={addForm.market_ids.includes(market.id)}
                        onChange={() => toggleAddMarket(market.id)}
                        className="rounded border-gray-600 bg-tastelanc-surface-light text-tastelanc-accent focus:ring-tastelanc-accent"
                      />
                      <span className="text-sm text-gray-300">{market.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                disabled={isAdding || !addForm.name.trim() || !addForm.email.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-tastelanc-accent hover:bg-tastelanc-accent-hover disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Member
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 bg-tastelanc-surface-light text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
