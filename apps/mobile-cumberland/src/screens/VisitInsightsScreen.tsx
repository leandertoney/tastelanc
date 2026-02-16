/**
 * Visit Insights Screen
 *
 * Restaurant analytics dashboard showing visit metrics, trends,
 * peak hours, visitor breakdown, and recommendation score lift.
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';
import { useRestaurantInsights, useRefreshInsights } from '../hooks/useRestaurantInsights';
import {
  MetricsHeader,
  VisitTrendGraph,
  PeakHoursHeatmap,
  RepeatVisitorBreakdown,
  ScoreLiftCard,
  NearbyDensityCard,
} from '../components/insights';

interface VisitInsightsScreenProps {
  restaurantId: string;
  onBack?: () => void;
}

// Skeleton loader for empty states
function SkeletonSection({ height = 200 }: { height?: number }) {
  return (
    <View style={[styles.skeletonCard, { height }]}>
      <View style={styles.skeletonShimmer} />
    </View>
  );
}

export default function VisitInsightsScreen({ restaurantId, onBack }: VisitInsightsScreenProps) {
  const { data: insights, isLoading, isRefetching, error } = useRestaurantInsights(restaurantId);
  const refreshInsights = useRefreshInsights();

  const handleRefresh = useCallback(async () => {
    await refreshInsights(restaurantId);
  }, [restaurantId, refreshInsights]);

  // Error state
  if (error && !insights) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Visit Insights</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Unable to Load Insights</Text>
          <Text style={styles.errorMessage}>
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const showSkeletons = isLoading && !insights;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Visit Insights</Text>
          {insights?.restaurantName && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {insights.restaurantName}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefetching}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={isRefetching ? colors.textMuted : colors.accent}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* Last Updated */}
        {insights?.lastUpdated && (
          <Text style={styles.lastUpdated}>
            Last updated: {new Date(insights.lastUpdated).toLocaleTimeString()}
          </Text>
        )}

        {/* Metrics Header */}
        {showSkeletons ? (
          <SkeletonSection height={180} />
        ) : insights?.metrics ? (
          <MetricsHeader metrics={insights.metrics} />
        ) : null}

        {/* Visit Trend Graph */}
        {showSkeletons ? (
          <SkeletonSection height={220} />
        ) : insights?.visitTrends ? (
          <VisitTrendGraph data={insights.visitTrends} />
        ) : null}

        {/* Peak Hours Heatmap */}
        {showSkeletons ? (
          <SkeletonSection height={280} />
        ) : insights?.peakHours ? (
          <PeakHoursHeatmap data={insights.peakHours} />
        ) : null}

        {/* Repeat Visitor Breakdown */}
        {showSkeletons ? (
          <SkeletonSection height={240} />
        ) : insights?.repeatBreakdown ? (
          <RepeatVisitorBreakdown data={insights.repeatBreakdown} />
        ) : null}

        {/* Score Lift Card */}
        {showSkeletons ? (
          <SkeletonSection height={280} />
        ) : insights?.scoreLift ? (
          <ScoreLiftCard data={insights.scoreLift} />
        ) : null}

        {/* Nearby Density Card */}
        {showSkeletons ? (
          <SkeletonSection height={240} />
        ) : insights?.nearbyDensity ? (
          <NearbyDensityCard data={insights.nearbyDensity} />
        ) : null}

        {/* Empty State */}
        {!showSkeletons && insights?.metrics.allTime.totalVisits === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Visit Data Yet</Text>
            <Text style={styles.emptyMessage}>
              Visit insights will appear here once customers start visiting through the app.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Data refreshes every 5 minutes
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 12,
  },
  skeletonCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    marginBottom: 16,
    overflow: 'hidden',
  },
  skeletonShimmer: {
    flex: 1,
    backgroundColor: colors.cardBgElevated,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.sm,
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
