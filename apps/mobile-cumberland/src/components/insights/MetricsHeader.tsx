/**
 * Metrics Header Component
 *
 * Displays key visit metrics with time range toggles (7d/30d/All)
 */

import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
import type { TimeRangeMetrics, VisitMetrics } from '../../lib/restaurantInsights';

type TimeRange = '7d' | '30d' | 'all';

interface MetricsHeaderProps {
  metrics: TimeRangeMetrics;
  isLoading?: boolean;
}

interface MetricCardProps {
  icon: string;
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
}

function MetricCard({ icon, label, value, suffix = '', color = colors.accent }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.metricValue}>
        {value}
        {suffix && <Text style={styles.metricSuffix}>{suffix}</Text>}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, styles.skeleton]} />
      <View style={[styles.skeletonValue, styles.skeleton]} />
      <View style={[styles.skeletonLabel, styles.skeleton]} />
    </View>
  );
}

export default function MetricsHeader({ metrics, isLoading }: MetricsHeaderProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');

  const getCurrentMetrics = (): VisitMetrics => {
    switch (selectedRange) {
      case '7d':
        return metrics.last7Days;
      case '30d':
        return metrics.last30Days;
      case 'all':
        return metrics.allTime;
    }
  };

  const currentMetrics = getCurrentMetrics();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Visit Metrics</Text>
          <View style={styles.rangeToggle}>
            {['7d', '30d', 'All'].map((range) => (
              <View key={range} style={styles.rangeButton}>
                <Text style={styles.rangeText}>{range}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.metricsGrid}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visit Metrics</Text>
        <View style={styles.rangeToggle}>
          {(['7d', '30d', 'all'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.rangeButton,
                selectedRange === range && styles.rangeButtonActive,
              ]}
              onPress={() => setSelectedRange(range)}
            >
              <Text
                style={[
                  styles.rangeText,
                  selectedRange === range && styles.rangeTextActive,
                ]}
              >
                {range === 'all' ? 'All' : range.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="footsteps"
          label="Total Visits"
          value={currentMetrics.totalVisits}
          color={colors.accent}
        />
        <MetricCard
          icon="people"
          label="Unique Visitors"
          value={currentMetrics.uniqueVisitors}
          color="#3B82F6"
        />
        <MetricCard
          icon="repeat"
          label="Repeat Visitors"
          value={currentMetrics.repeatVisitors}
          color="#10B981"
        />
        <MetricCard
          icon="trending-up"
          label="Repeat Rate"
          value={currentMetrics.repeatRate}
          suffix="%"
          color="#F59E0B"
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    padding: 2,
  },
  rangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm - 2,
  },
  rangeButtonActive: {
    backgroundColor: colors.accent,
  },
  rangeText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  rangeTextActive: {
    color: colors.text,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  metricCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  metricSuffix: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textMuted,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  skeleton: {
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
  },
  skeletonValue: {
    width: 60,
    height: 24,
    marginBottom: 4,
  },
  skeletonLabel: {
    width: 80,
    height: 14,
  },
});
