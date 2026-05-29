'use client';

import { useState } from 'react';
import { X, Settings, Star } from 'lucide-react';

interface ManageRestaurantModalProps {
  restaurant: {
    id: string;
    name: string;
    tier_id?: string;
    has_pick_badge?: boolean;
    tiers?: {
      name: string;
      display_name?: string;
    };
  };
  onClose: () => void;
  onSuccess: () => void;
}

// Tier UUIDs from base schema
const TIER_IDS = {
  basic: '00000000-0000-0000-0000-000000000001',
  premium: '00000000-0000-0000-0000-000000000002',
  elite: '00000000-0000-0000-0000-000000000003',
};

export default function ManageRestaurantModal({
  restaurant,
  onClose,
  onSuccess,
}: ManageRestaurantModalProps) {
  const [tier, setTier] = useState(restaurant.tier_id || TIER_IDS.basic);
  const [hasPick, setHasPick] = useState(restaurant.has_pick_badge || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier_id: tier,
          has_pick_badge: hasPick,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update restaurant');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-tastelanc-bg rounded-xl w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-tastelanc-surface-light">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-tastelanc-accent" />
            <h2 className="text-xl font-bold text-tastelanc-text-primary">
              Manage Restaurant
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-tastelanc-text-muted hover:text-tastelanc-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          <div>
            <p className="text-sm text-tastelanc-text-muted mb-4">
              {restaurant.name}
            </p>
          </div>

          {/* Tier Selection */}
          <div>
            <label className="block text-sm font-medium text-tastelanc-text-primary mb-2">
              Subscription Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-4 py-2.5 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-tastelanc-text-primary focus:outline-none focus:ring-2 focus:ring-tastelanc-accent"
            >
              <option value={TIER_IDS.basic}>Basic (Free)</option>
              <option value={TIER_IDS.premium}>Premium</option>
              <option value={TIER_IDS.elite}>Elite</option>
            </select>
            <p className="text-xs text-tastelanc-text-muted mt-1.5">
              Changes tier access to platform features
            </p>
          </div>

          {/* Pick Badge Toggle */}
          <div className="bg-tastelanc-surface rounded-lg p-4 border border-tastelanc-surface-light">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasPick}
                onChange={(e) => setHasPick(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-tastelanc-surface-light text-tastelanc-accent focus:ring-2 focus:ring-tastelanc-accent"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium text-tastelanc-text-primary">
                    TasteLanc Pick Badge
                  </span>
                </div>
                <p className="text-xs text-tastelanc-text-muted">
                  Displays gold star badge on restaurant cards in mobile apps. Granted
                  manually for quality/commitment (e.g., 2-year subscriptions).
                </p>
              </div>
            </label>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-tastelanc-surface-light">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-tastelanc-text-muted hover:text-tastelanc-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium bg-tastelanc-accent hover:bg-tastelanc-accent/90 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
