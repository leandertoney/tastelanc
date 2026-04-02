/**
 * Visit Trend Graph Component
 *
 * Displays a 14-30 day line/bar chart of visit trends
 */

import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { colors, radius } from '../../constants/colors';
import type { DailyVisitTrend } from '../../lib/restaurantInsights';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 120;
const CHART_PADDING = 16;

interface VisitTrendGraphProps {
  data: DailyVisitTrend[];
  isLoading?: boolean;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function VisitTrendGraph({ data, isLoading }: VisitTrendGraphProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Visit Trends</Text>
          <Text style={styles.subtitle}>Last 30 days</Text>
        </View>
        <View style={[styles.chartArea, styles.skeleton]} />
      </View>
    );
  }

  // Calculate chart dimensions
  const chartWidth = SCREEN_WIDTH - 32 - CHART_PADDING * 2;
  const maxVisits = Math.max(...data.map((d) => d.visits), 1);
  const barWidth = Math.max((chartWidth / data.length) - 2, 4);

  // Get total stats
  const totalVisits = data.reduce((sum, d) => sum + d.visits, 0);
  const avgVisits = data.length > 0 ? Math.round(totalVisits / data.length) : 0;
  const peakDay = data.reduce((max, d) => (d.visits > max.visits ? d : max), data[0] || { date: '', visits: 0 });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Visit Trends</Text>
          <Text style={styles.subtitle}>Last {data.length} days</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalVisits}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{avgVisits}</Text>
            <Text style={styles.statLabel}>Avg/Day</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartArea}>
        <View style={styles.chartContainer}>
          {data.map((day, index) => {
            const height = (day.visits / maxVisits) * CHART_HEIGHT;
            const isToday = index === data.length - 1;
            const isPeak = day.visits === peakDay.visits && day.visits > 0;

            return (
              <View key={day.date} style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(height, 2),
                      width: barWidth,
                      backgroundColor: isPeak
                        ? colors.accent
                        : isToday
                        ? '#3B82F6'
                        : colors.cardBgElevated,
                    },
                  ]}
                />
                {(index === 0 || index === data.length - 1 || isPeak) && (
                  <Text style={styles.barLabel}>
                    {isPeak ? day.visits : formatDate(day.date)}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.yAxisLabel}>{maxVisits}</Text>
          <Text style={styles.yAxisLabel}>{Math.round(maxVisits / 2)}</Text>
          <Text style={styles.yAxisLabel}>0</Text>
        </View>
      </View>

      {peakDay.visits > 0 && (
        <View style={styles.peakInfo}>
          <View style={[styles.peakDot, { backgroundColor: colors.accent }]} />
          <Text style={styles.peakText}>
            Peak: {peakDay.visits} visits on {formatDate(peakDay.date)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: CHART_PADDING,
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
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  chartArea: {
    height: CHART_HEIGHT + 30,
    flexDirection: 'row',
    position: 'relative',
  },
  chartContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingRight: 30,
  },
  barContainer: {
    alignItems: 'center',
  },
  bar: {
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  yAxis: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 20,
    width: 25,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  peakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  peakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  peakText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  skeleton: {
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
  },
});
