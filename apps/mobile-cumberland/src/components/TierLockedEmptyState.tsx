/**
 * TierLockedEmptyState Component
 *
 * Displays when content is locked due to subscription tier restrictions.
 * Shows a "See other [feature]" link to direct users to other restaurants
 * with content, creating competitive pressure for restaurants to upgrade.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { SubscriptionTier } from '@/lib/tier-access';
import { trackLockedContentView } from '@/lib/tier-analytics';
import { isTierGatingEnabled } from '@/lib/feature-flags';
import { colors, radius, spacing } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Feature type mapping to navigation routes and labels
type FeatureType = 'Happy Hours' | 'Specials' | 'Events' | 'Menu';

const FEATURE_CONFIG: Record<FeatureType, {
  route: keyof RootStackParamList | null;
  seeOtherLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = {
  'Happy Hours': {
    route: 'HappyHoursViewAll',
    seeOtherLabel: 'See other happy hours',
    icon: 'beer-outline',
  },
  'Specials': {
    route: 'SpecialsViewAll',
    seeOtherLabel: 'See other specials',
    icon: 'pricetag-outline',
  },
  'Events': {
    route: 'EventsViewAll',
    seeOtherLabel: 'See other events',
    icon: 'calendar-outline',
  },
  'Menu': {
    route: null, // No "see other menus" page yet
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
}: TierLockedEmptyStateProps) {
  const navigation = useNavigation<NavigationProp>();
  const tierGatingEnabled = isTierGatingEnabled();

  const config = FEATURE_CONFIG[featureName] || FEATURE_CONFIG['Menu'];
  const displayIcon = icon || config.icon;

  // Track when this locked state is viewed
  useEffect(() => {
    if (tierGatingEnabled && tier) {
      trackLockedContentView(
        restaurantId,
        restaurantName,
        tier,
        featureName.toLowerCase().replace(/ /g, '_'),
        userId
      );
    }
  }, [tierGatingEnabled, restaurantId, restaurantName, tier, featureName, userId]);

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

  // Handle "See other" navigation
  const handleSeeOther = () => {
    if (config.route) {
      // @ts-ignore - Route type checking will be fine at runtime
      navigation.navigate(config.route);
    } else {
      // Fallback to main tabs for features without dedicated ViewAll
      navigation.navigate('MainTabs', { screen: 'Search' });
    }
  };

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Ionicons name={displayIcon} size={48} color={colors.textSecondary} />
      </View>

      {/* Title */}
      <Text style={styles.title}>{message.title}</Text>

      {/* Message */}
      <Text style={styles.message}>{message.message}</Text>

      {/* Encouragement */}
      <Text style={styles.encouragement}>
        Check back later or explore what's happening elsewhere!
      </Text>

      {/* See Other CTA */}
      <TouchableOpacity
        style={styles.seeOtherButton}
        onPress={handleSeeOther}
        activeOpacity={0.7}
      >
        <Text style={styles.seeOtherButtonText}>{config.seeOtherLabel}</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
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
});
