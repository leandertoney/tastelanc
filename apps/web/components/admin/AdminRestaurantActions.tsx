'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
  Loader2,
  Save,
  StickyNote,
} from 'lucide-react';
import { toast } from 'sonner';

interface Tier {
  id: string;
  name: string;
  display_name: string;
}

interface AdminRestaurantActionsProps {
  restaurantId: string;
  initialIsActive: boolean;
  initialIsVerified: boolean;
  initialTierId: string;
  initialAdminNotes: string | null;
  tiers: Tier[];
}

export default function AdminRestaurantActions({
  restaurantId,
  initialIsActive,
  initialIsVerified,
  initialTierId,
  initialAdminNotes,
  tiers,
}: AdminRestaurantActionsProps) {
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isVerified, setIsVerified] = useState(initialIsVerified);
  const [tierId, setTierId] = useState(initialTierId);
  const [adminNotes, setAdminNotes] = useState(initialAdminNotes || '');
  const [saving, setSaving] = useState<string | null>(null);

  const updateField = async (field: string, value: any) => {
    setSaving(field);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Failed to update');
        return false;
      }

      toast.success('Updated successfully');
      return true;
    } catch {
      toast.error('Failed to update');
      return false;
    } finally {
      setSaving(null);
    }
  };

  const handleToggleActive = async () => {
    const newValue = !isActive;
    const success = await updateField('is_active', newValue);
    if (success) setIsActive(newValue);
  };

  const handleToggleVerified = async () => {
    const newValue = !isVerified;
    const success = await updateField('is_verified', newValue);
    if (success) setIsVerified(newValue);
  };

  const handleTierChange = async (newTierId: string) => {
    const success = await updateField('tier_id', newTierId);
    if (success) setTierId(newTierId);
  };

  const handleSaveNotes = async () => {
    await updateField('admin_notes', adminNotes);
  };

  const currentTier = tiers.find((t) => t.id === tierId);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Toggle */}
        <button
          onClick={handleToggleActive}
          disabled={saving === 'is_active'}
          className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4 text-left hover:border-tastelanc-accent/50 transition-colors disabled:opacity-50"
        >
          <p className="text-sm text-gray-400 mb-1">Status</p>
          <div className="flex items-center gap-2">
            {saving === 'is_active' ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : isActive ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="text-white font-medium">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Click to toggle</p>
        </button>

        {/* Verified Toggle */}
        <button
          onClick={handleToggleVerified}
          disabled={saving === 'is_verified'}
          className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4 text-left hover:border-tastelanc-accent/50 transition-colors disabled:opacity-50"
        >
          <p className="text-sm text-gray-400 mb-1">Verified</p>
          <div className="flex items-center gap-2">
            {saving === 'is_verified' ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : isVerified ? (
              <Shield className="w-5 h-5 text-lancaster-gold" />
            ) : (
              <ShieldOff className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-white font-medium">
              {isVerified ? 'Verified' : 'Not Verified'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Click to toggle</p>
        </button>

        {/* Tier Selector */}
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Tier</p>
          <div className="relative">
            {saving === 'tier_id' ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                <span className="text-white font-medium">Saving...</span>
              </div>
            ) : (
              <select
                value={tierId}
                onChange={(e) => handleTierChange(e.target.value)}
                className="w-full bg-tastelanc-bg border border-tastelanc-surface-light rounded-md px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-tastelanc-accent appearance-none cursor-pointer"
              >
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.display_name || t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Current: {currentTier?.display_name || currentTier?.name || 'Unknown'}
          </p>
        </div>

        {/* Subscription Info (read-only) */}
        <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-4">
          <p className="text-sm text-gray-400 mb-1">Subscription</p>
          <p className="text-white font-medium capitalize">
            {currentTier?.display_name || currentTier?.name || 'Basic'}
          </p>
        </div>
      </div>

      {/* Admin Notes */}
      <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-tastelanc-accent" />
            Admin Notes
          </h2>
          <button
            onClick={handleSaveNotes}
            disabled={saving === 'admin_notes' || adminNotes === (initialAdminNotes || '')}
            className="flex items-center gap-2 px-3 py-1.5 bg-tastelanc-accent text-white rounded-lg text-sm hover:bg-tastelanc-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving === 'admin_notes' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Notes
          </button>
        </div>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Internal notes about this restaurant (not visible to the owner)..."
          rows={4}
          className="w-full bg-tastelanc-bg border border-tastelanc-surface-light rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-tastelanc-accent resize-y"
        />
        {adminNotes !== (initialAdminNotes || '') && (
          <p className="text-xs text-yellow-500 mt-2">Unsaved changes</p>
        )}
      </div>
    </div>
  );
}
