/**
 * Nearby Density Card Component
 *
 * Displays nearby customer activity indicator
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
import type { NearbyDensity } from '../../lib/restaurantInsights';

interface NearbyDensityCardProps {
  data: NearbyDensity;
  isLoading?: boolean;
}

function getDensityConfig(level: 'low' | 'medium' | 'high') {
  switch (level) {
    case 'high':
      return {
        color: '#10B981',
        icon: 'pulse',
        label: 'High Activity',
        description: 'Lots of potential customers nearby!',
        pulseCount: 3,
      };
    case 'medium':
      return {
        color: '#F59E0B',
        icon: 'radio-outline',
        label: 'Moderate Activity',
        description: 'Steady foot traffic in the area',
        pulseCount: 2,
      };
    case 'low':
    default:
      return {
        color: colors.textMuted,
        icon: 'radio-outline',
        label: 'Low Activity',
        description: 'Quiet period - great for prep work',
        pulseCount: 1,
      };
  }
}

export default function NearbyDensityCard({ data, isLoading }: NearbyDensityCardProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.skeletonContent, styles.skeleton]} />
      </View>
    );
  }

  const config = getDensityConfig(data.densityLevel);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Nearby Activity</Text>
          <Text style={styles.subtitle}>Within {data.radiusMeters}m radius</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: config.color }]} />
          <Text style={[styles.statusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metric}>
          <View style={styles.metricIconContainer}>
            <Ionicons name="people" size={18} color="#3B82F6" />
          </View>
          <Text style={styles.metricValue}>{data.recentVisitors}</Text>
          <Text style={styles.metricLabel}>Recent visitors{'\n'}(24h)</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metric}>
          <View style={styles.metricIconContainer}>
            <Ionicons name="navigate" size={18} color="#8B5CF6" />
          </View>
          <Text style={styles.metricValue}>{data.potentialReach}</Text>
          <Text style={styles.metricLabel}>Potential{'\n'}reach</Text>
        </View>
      </View>

      {/* Activity visualization */}
      <View style={styles.visualizationContainer}>
        <View style={styles.radarContainer}>
          {/* Concentric circles */}
          <View style={[styles.radarRing, styles.radarRing1]} />
          <View style={[styles.radarRing, styles.radarRing2]} />
          <View style={[styles.radarRing, styles.radarRing3]} />

          {/* Center point (restaurant) */}
          <View style={styles.centerPoint}>
            <Ionicons name="restaurant" size={16} color={colors.text} />
          </View>

          {/* Activity dots based on density */}
          {data.densityLevel !== 'low' && (
            <>
              <View style={[styles.activityDot, { top: '25%', left: '60%', backgroundColor: config.color }]} />
              <View style={[styles.activityDot, { top: '45%', left: '75%', backgroundColor: config.color }]} />
              <View style={[styles.activityDot, { top: '65%', left: '30%', backgroundColor: config.color }]} />
            </>
          )}
          {data.densityLevel === 'high' && (
            <>
              <View style={[styles.activityDot, { top: '35%', left: '25%', backgroundColor: config.color }]} />
              <View style={[styles.activityDot, { top: '55%', left: '65%', backgroundColor: config.color }]} />
              <View style={[styles.activityDot, { top: '75%', left: '55%', backgroundColor: config.color }]} />
            </>
          )}
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{config.description}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    padding: 16,
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 14,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  visualizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarContainer: {
    width: 100,
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radarRing1: {
    width: 30,
    height: 30,
  },
  radarRing2: {
    width: 60,
    height: 60,
  },
  radarRing3: {
    width: 90,
    height: 90,
  },
  centerPoint: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  activityDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.7,
  },
  descriptionContainer: {
    flex: 1,
    marginLeft: 16,
  },
  descriptionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  skeletonContent: {
    height: 200,
  },
  skeleton: {
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
  },
});
