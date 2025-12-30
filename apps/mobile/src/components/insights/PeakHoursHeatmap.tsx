/**
 * Peak Hours Heatmap Component
 *
 * Displays hourly visit distribution as a heatmap grid
 */

import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../../constants/colors';
import type { HourlyDistribution } from '../../lib/restaurantInsights';

interface PeakHoursHeatmapProps {
  data: HourlyDistribution[];
  isLoading?: boolean;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

function getHeatColor(percentage: number, maxPercentage: number): string {
  if (maxPercentage === 0 || percentage === 0) return colors.cardBgElevated;

  const intensity = percentage / maxPercentage;

  if (intensity > 0.8) return colors.accent; // Hot
  if (intensity > 0.6) return '#F59E0B'; // Warm orange
  if (intensity > 0.4) return '#FBBF24'; // Yellow
  if (intensity > 0.2) return '#34D399'; // Light green
  return colors.cardBgElevated; // Cool/empty
}

export default function PeakHoursHeatmap({ data, isLoading }: PeakHoursHeatmapProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Peak Hours</Text>
          <Text style={styles.subtitle}>Hourly visit distribution</Text>
        </View>
        <View style={[styles.heatmapSkeleton, styles.skeleton]} />
      </View>
    );
  }

  const maxPercentage = Math.max(...data.map((d) => d.percentage), 0);
  const peakHour = data.reduce((max, d) => (d.percentage > max.percentage ? d : max), data[0]);
  const totalVisits = data.reduce((sum, d) => sum + d.visits, 0);

  // Group hours into 4 rows of 6 hours each
  const rows = [
    data.slice(0, 6),   // 12am-5am
    data.slice(6, 12),  // 6am-11am
    data.slice(12, 18), // 12pm-5pm
    data.slice(18, 24), // 6pm-11pm
  ];

  const rowLabels = ['Night', 'Morning', 'Afternoon', 'Evening'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Peak Hours</Text>
          <Text style={styles.subtitle}>Based on {totalVisits} visits</Text>
        </View>
        {peakHour && peakHour.visits > 0 && (
          <View style={styles.peakBadge}>
            <Text style={styles.peakBadgeText}>Peak: {formatHour(peakHour.hour)}</Text>
          </View>
        )}
      </View>

      <View style={styles.heatmapContainer}>
        {/* Hour labels */}
        <View style={styles.hourLabelsRow}>
          <View style={styles.rowLabelSpacer} />
          {data.slice(0, 6).map((_, i) => (
            <View key={i} style={styles.hourLabelCell}>
              <Text style={styles.hourLabel}>{formatHour(i)}</Text>
            </View>
          ))}
        </View>

        {/* Heatmap rows */}
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.heatmapRow}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowLabelText}>{rowLabels[rowIndex]}</Text>
            </View>
            {row.map((hour) => (
              <View
                key={hour.hour}
                style={[
                  styles.heatCell,
                  { backgroundColor: getHeatColor(hour.percentage, maxPercentage) },
                ]}
              >
                {hour.visits > 0 && (
                  <Text style={styles.cellValue}>{hour.visits}</Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Low</Text>
        <View style={styles.legendGradient}>
          <View style={[styles.legendCell, { backgroundColor: colors.cardBgElevated }]} />
          <View style={[styles.legendCell, { backgroundColor: '#34D399' }]} />
          <View style={[styles.legendCell, { backgroundColor: '#FBBF24' }]} />
          <View style={[styles.legendCell, { backgroundColor: '#F59E0B' }]} />
          <View style={[styles.legendCell, { backgroundColor: colors.accent }]} />
        </View>
        <Text style={styles.legendLabel}>High</Text>
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
    alignItems: 'flex-start',
    marginBottom: 16,
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
  peakBadge: {
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  peakBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  heatmapContainer: {
    marginBottom: 16,
  },
  hourLabelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rowLabelSpacer: {
    width: 60,
  },
  hourLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  hourLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  heatmapRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  rowLabel: {
    width: 60,
    justifyContent: 'center',
  },
  rowLabelText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  heatCell: {
    flex: 1,
    aspectRatio: 1.2,
    marginHorizontal: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellValue: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.primary,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legendLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  legendGradient: {
    flexDirection: 'row',
    gap: 2,
  },
  legendCell: {
    width: 20,
    height: 12,
    borderRadius: 2,
  },
  heatmapSkeleton: {
    height: 180,
  },
  skeleton: {
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
  },
});
