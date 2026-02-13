'use client';

import { useEffect, useState } from 'react';
import { Users, UserPlus, Trash2, RefreshCw, Mail, Shield, Crown, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui';
import TierGate from '@/components/TierGate';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { toast } from 'sonner';
import type { RestaurantMember } from '@/types/database';

interface TeamData {
  members: RestaurantMember[];
  owner: { id: string; email: string | null };
}

export default function TeamPage() {
  const { restaurant, buildApiUrl, isOwner, isAdmin, isMember } = useRestaurant();
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  const canManage = isOwner || isAdmin;

  const fetchTeam = async () => {
    if (!restaurant?.id) return;
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/dashboard/team'));
      if (res.ok) {
        const data = await res.json();
        setTeamData(data);
      }
    } catch (err) {
      console.error('Error fetching team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) {
      fetchTeam();
    } else {
      setLoading(false);
    }
  }, [restaurant?.id, canManage]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !restaurant?.id) return;

    setInviting(true);
    try {
      const res = await fetch(buildApiUrl('/api/dashboard/team'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Invitation sent successfully');
        setInviteEmail('');
        setShowInviteForm(false);
        fetchTeam();
      } else {
        toast.error(data.error || 'Failed to send invitation');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Remove ${memberEmail} from the team?`)) return;

    setRemovingId(memberId);
    try {
      const res = await fetch(buildApiUrl(`/api/dashboard/team/${memberId}`), {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Team member removed');
        fetchTeam();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to remove team member');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setRemovingId(null);
    }
  };

  const handleResend = async (memberId: string) => {
    setResendingId(memberId);
    try {
      const res = await fetch(buildApiUrl(`/api/dashboard/team/${memberId}`), {
        method: 'PATCH',
      });

      if (res.ok) {
        toast.success('Invite resent');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to resend invite');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setResendingId(null);
    }
  };

  const memberCount = teamData?.members?.filter((m) => m.status !== 'revoked').length || 0;

  return (
    <TierGate
      requiredTier="elite"
      feature="Team Management"
      description="Upgrade to Elite to invite managers and staff to help manage your restaurant's dashboard."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-tastelanc-accent" />
              Team
            </h1>
            <p className="text-gray-400 mt-1">Manage who has access to your restaurant dashboard</p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowInviteForm(true)}
              disabled={memberCount >= 5}
              className="flex items-center gap-2 px-4 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-4 h-4" />
              Invite Member
            </button>
          )}
        </div>

        {/* Manager restriction message */}
        {isMember && !isOwner && !isAdmin && (
          <Card>
            <CardContent className="py-8 text-center">
              <Shield className="w-10 h-10 text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400">
                You&apos;re a manager for this restaurant. Only the restaurant owner can manage team members.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Invite Form */}
        {showInviteForm && canManage && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-white">Invite Team Member</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                    className="w-full px-4 py-2 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {inviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  {inviting ? 'Sending...' : 'Send Invite'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </form>
              <p className="text-gray-500 text-sm mt-3">
                They&apos;ll receive an email to set up their account. Managers can edit content but cannot manage team members or billing.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && canManage && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-tastelanc-accent mx-auto" />
            </CardContent>
          </Card>
        )}

        {/* Team Members List */}
        {!loading && canManage && teamData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Team Members ({memberCount + 1})
                </h2>
                <span className="text-gray-500 text-sm">
                  {memberCount}/5 managers
                </span>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-tastelanc-surface-light">
              {/* Owner Row */}
              <div className="flex items-center justify-between py-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{teamData.owner.email || 'Owner'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
                        Owner
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              {teamData.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-tastelanc-surface rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                          Manager
                        </span>
                        {member.status === 'pending' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                            Pending
                          </span>
                        )}
                        {member.status === 'active' && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                            Active
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          Invited {new Date(member.invited_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.status === 'pending' && (
                      <button
                        onClick={() => handleResend(member.id)}
                        disabled={resendingId === member.id}
                        className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                        title="Resend invite"
                      >
                        {resendingId === member.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(member.id, member.email)}
                      disabled={removingId === member.id}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Remove member"
                    >
                      {removingId === member.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {teamData.members.length === 0 && (
                <div className="py-8 text-center">
                  <UserPlus className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No team members yet</p>
                  <p className="text-gray-500 text-sm mt-1">Invite managers to help run your dashboard</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TierGate>
  );
}
