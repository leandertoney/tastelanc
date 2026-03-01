'use client';

import { useState, useEffect } from 'react';
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

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    market_ids: [] as string[],
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const startEdit = (member: TeamMember) => {
    setEditingId(member.id);
    setEditForm({
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

  const toggleMarket = (marketId: string) => {
    setEditForm(prev => ({
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

      {/* Team list */}
      <div className="space-y-3">
        {members.map((member) => {
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
    </div>
  );
}
