/**
 * TierLockedEmptyState Component
 *
 * Displays when content is locked due to subscription tier restrictions.
 * Shows a "See other [feature]" link to direct users to other restaurants
 * with content, creating competitive pressure for restaurants to upgrade.
 */

import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SubscriptionTier } from '../lib/tier-access';
import { trackLockedContentView } from '../lib/tier-analytics';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import BasicTierAlternativesSection from './BasicTierAlternativesSection';
import type { RestaurantCategory, CuisineType } from '../types/database';

// Feature type mapping to labels
type FeatureType = 'Happy Hours' | 'Specials' | 'Events' | 'Menu';

const FEATURE_CONFIG: Record<FeatureType, {
  seeOtherLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  'Happy Hours': {
    seeOtherLabel: 'See other happy hours',
    icon: 'beer-outline',
  },
  'Specials': {
    seeOtherLabel: 'See other specials',
    icon: 'pricetag-outline',
  },
  'Events': {
    seeOtherLabel: 'See other events',
    icon: 'calendar-outline',
  },
  'Menu': {
    seeOtherLabel: 'Browse restaurants',
    icon: 'restaurant-outline',
  },
};

interface TierLockedEmptyStateProps {
  /** Name of the locked feature (e.g., "Happy Hours", "Menu") */
  featureName: FeatureType;

  /** Name of the restaurant */
  restaurantName: string;

  /** Restaurant ID for analytics tracking */
  restaurantId: string;

  /** Current subscription tier */
  tier: SubscriptionTier | null;

  /** Icon to display (overrides default from feature config) */
  icon?: keyof typeof Ionicons.glyphMap;

  /** Number of items that exist but are locked (for preview) */
  itemCount?: number;

  /** Preview text to show (e.g., "Monday-Thursday specials") */
  previewText?: string;

  /** Optional user ID for analytics */
  userId?: string | null;

  /** Callback when the "See other" button is pressed — each app wires to its own navigator */
  onSeeOther?: () => void;
  /** Categories for alternatives matching */
  categories?: RestaurantCategory[];
  /** Cuisine for alternatives matching */
  cuisine?: CuisineType | null;
  /** Market ID for alternatives query */
  marketId?: string | null;
  /** Callback when an alternative restaurant card is pressed */
  onAlternativePress?: (restaurantId: string) => void;
}

export default function TierLockedEmptyState({
  featureName,
  restaurantName,
  restaurantId,
  tier,
  icon,
  itemCount = 0,
  // previewText - kept in props interface for future use
  userId,
  onSeeOther,
  categories,
  cuisine,
  marketId,
  onAlternativePress,
}: TierLockedEmptyStateProps) {
  const styles = useStyles();
  const colors = getColors();
  const config = FEATURE_CONFIG[featureName] || FEATURE_CONFIG['Menu'];
  const displayIcon = icon || config.icon;

  // Track when this locked state is viewed
  useEffect(() => {
    if (tier) {
      trackLockedContentView(
        restaurantId,
        restaurantName,
        tier,
        featureName.toLowerCase().replace(/ /g, '_'),
        userId
      );
    }
  }, [restaurantId, restaurantName, tier, featureName, userId]);

  // Get messaging based on content state
  const getMessage = () => {
    if (itemCount === 0) {
      return {
        title: `No ${featureName} Yet`,
        message: `${restaurantName} hasn't added their ${featureName.toLowerCase()} yet.`,
      };
    } else {
      return {
        title: `${featureName} Coming Soon`,
        message: `${restaurantName} has ${featureName.toLowerCase()} available but they're not shown here yet.`,
      };
    }
  };

  const message = getMessage();
  const hasAlternatives = !!(marketId && onAlternativePress);

  return (
    <View style={styles.container}>
      {hasAlternatives ? (
        /* Compact one-liner when alternatives are shown below */
        <View style={styles.compactRow}>
          <Ionicons name={displayIcon} size={16} color={colors.textSecondary} />
          <Text style={styles.compactText}>{message.title}</Text>
        </View>
      ) : (
        /* Verbose standalone layout when there's nothing else to show */
        <View style={styles.centeredContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={displayIcon} size={48} color={colors.textSecondary} />
          </View>
          <Text style={styles.title}>{message.title}</Text>
          <Text style={styles.message}>{message.message}</Text>
          <Text style={styles.encouragement}>
            Check back later or explore what's happening elsewhere!
          </Text>
          {onSeeOther && (
            <TouchableOpacity
              style={styles.seeOtherButton}
              onPress={onSeeOther}
              activeOpacity={0.7}
            >
              <Text style={styles.seeOtherButtonText}>{config.seeOtherLabel}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Full-width alternatives — outside centered wrapper so horizontal scroll fills the screen */}
      {hasAlternatives && (
        <BasicTierAlternativesSection
          categories={categories ?? []}
          cuisine={cuisine ?? null}
          marketId={marketId!}
          excludeId={restaurantId}
          featureName={featureName}
          onRestaurantPress={onAlternativePress!}
        />
      )}
    </View>
  );
}

export type { FeatureType };

const useStyles = createLazyStyles((colors) => ({
  container: {
    // No top-level alignItems — centeredContent handles centering,
    // BasicTierAlternativesSection expands to full width
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  compactText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  centeredContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: spacing.md,
    opacity: 0.7,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  encouragement: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  seeOtherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBg,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  seeOtherButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
}));
