'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import type { SubscriptionTier } from '@/types/database';

interface TierGateProps {
  /** The minimum tier required to access this feature */
  requiredTier: 'premium' | 'elite';
  /** Display name of the feature being gated */
  feature: string;
  /** Content to show if user has access */
  children: ReactNode;
  /** Optional: Show a compact inline lock instead of full-page gate */
  inline?: boolean;
  /** Optional: Custom description for the upgrade prompt */
  description?: string;
}

// Tier hierarchy for comparison
const TIER_LEVELS: Record<SubscriptionTier, number> = {
  basic: 0,
  premium: 1,
  elite: 2,
};

/**
 * TierGate component - Gates content behind subscription tiers
 *
 * Usage:
 * <TierGate requiredTier="premium" feature="Menu Management">
 *   <MenuEditor />
 * </TierGate>
 */
export default function TierGate({
  requiredTier,
  feature,
  children,
  inline = false,
  description,
}: TierGateProps) {
  const { restaurant, tierName, isAdmin } = useRestaurant();

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check if user's tier meets requirement
  const currentTierLevel = TIER_LEVELS[tierName || 'basic'];
  const requiredTierLevel = TIER_LEVELS[requiredTier];
  const hasAccess = currentTierLevel >= requiredTierLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - show upgrade prompt
  if (inline) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Lock className="w-4 h-4" />
        <span>Upgrade to {requiredTier === 'elite' ? 'Elite' : 'Premium'} to access</span>
        <Link
          href="/dashboard/subscription"
          className="text-tastelanc-accent hover:underline"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  // Full-page upgrade prompt
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="max-w-md text-center px-6">
        {/* Icon */}
        <div className="mb-6">
          {requiredTier === 'elite' ? (
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-yellow-500 to-amber-600 rounded-full flex items-center justify-center">
              <Crown className="w-10 h-10 text-white" />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-tastelanc-accent to-blue-600 rounded-full flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-3">
          {feature} is a {requiredTier === 'elite' ? 'Elite' : 'Premium'} Feature
        </h2>

        {/* Description */}
        <p className="text-gray-400 mb-6">
          {description ||
            `Upgrade to ${requiredTier === 'elite' ? 'Elite' : 'Premium'} to unlock ${feature.toLowerCase()} and grow your restaurant's presence on TasteLanc.`}
        </p>

        {/* Tier comparison */}
        <div className="bg-tastelanc-surface rounded-lg p-4 mb-6 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-400">Your current tier:</span>
            <span className="font-medium text-white capitalize">{tierName || 'Basic'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Required tier:</span>
            <span className={`font-medium capitalize ${requiredTier === 'elite' ? 'text-yellow-500' : 'text-tastelanc-accent'}`}>
              {requiredTier}
            </span>
          </div>
        </div>

        {/* Pricing info */}
        <div className="bg-tastelanc-card border border-tastelanc-surface-light rounded-lg p-4 mb-6">
          {requiredTier === 'elite' ? (
            <div>
              <p className="text-yellow-500 font-semibold mb-1">Elite Plan</p>
              <p className="text-gray-300">Starting at $350 for 3 months</p>
              <p className="text-gray-500 text-sm">or $1,100/year (save $300)</p>
            </div>
          ) : (
            <div>
              <p className="text-tastelanc-accent font-semibold mb-1">Premium Plan</p>
              <p className="text-gray-300">Starting at $250 for 3 months</p>
              <p className="text-gray-500 text-sm">or $800/year (save $200)</p>
            </div>
          )}
        </div>

        {/* CTA Button */}
        <Link
          href="/dashboard/subscription"
          className={`inline-flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-colors ${
            requiredTier === 'elite'
              ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black'
              : 'bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white'
          }`}
        >
          {requiredTier === 'elite' ? <Crown className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          Upgrade to {requiredTier === 'elite' ? 'Elite' : 'Premium'}
        </Link>

        {/* Current tier features link */}
        <p className="mt-4 text-gray-500 text-sm">
          <Link href="/dashboard" className="hover:text-gray-400">
            Continue with Basic features
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Hook to check tier access programmatically
 */
export function useTierAccess(requiredTier: 'premium' | 'elite'): boolean {
  const { tierName, isAdmin } = useRestaurant();

  if (isAdmin) return true;

  const currentTierLevel = TIER_LEVELS[tierName || 'basic'];
  const requiredTierLevel = TIER_LEVELS[requiredTier];

  return currentTierLevel >= requiredTierLevel;
}
