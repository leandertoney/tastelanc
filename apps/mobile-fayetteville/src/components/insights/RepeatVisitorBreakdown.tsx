/**
 * Repeat Visitor Breakdown Component
 *
 * Displays visitor frequency distribution as horizontal bars
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
import type { RepeatVisitorBreakdown as BreakdownData } from '../../lib/restaurantInsights';

interface RepeatVisitorBreakdownProps {
  data: BreakdownData;
  isLoading?: boolean;
}

interface BarRowProps {
  label: string;
  count: number;
  percentage: number;
  color: string;
  icon: string;
}

function BarRow({ label, count, percentage, color, icon }: BarRowProps) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barLabel}>
        <View style={[styles.barIcon, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <Text style={styles.barLabelText}>{label}</Text>
      </View>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            {
              width: `${Math.max(percentage, 2)}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <View style={styles.barValue}>
        <Text style={styles.countText}>{count}</Text>
        <Text style={styles.percentText}>{percentage.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

export default function RepeatVisitorBreakdown({ data, isLoading }: RepeatVisitorBreakdownProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Visitor Frequency</Text>
        <View style={[styles.skeletonContent, styles.skeleton]} />
      </View>
    );
  }

  const total = data.oneVisit + data.twoToThreeVisits + data.fourToSixVisits + data.sevenPlusVisits;

  const getPercentage = (count: number) => (total > 0 ? (count / total) * 100 : 0);

  const categories = [
    {
      label: '1 visit',
      count: data.oneVisit,
      percentage: getPercentage(data.oneVisit),
      color: colors.textMuted,
      icon: 'person-outline',
    },
    {
      label: '2-3 visits',
      count: data.twoToThreeVisits,
      percentage: getPercentage(data.twoToThreeVisits),
      color: '#3B82F6',
      icon: 'people-outline',
    },
    {
      label: '4-6 visits',
      count: data.fourToSixVisits,
      percentage: getPercentage(data.fourToSixVisits),
      color: '#10B981',
      icon: 'heart-outline',
    },
    {
      label: '7+ visits',
      count: data.sevenPlusVisits,
      percentage: getPercentage(data.sevenPlusVisits),
      color: colors.accent,
      icon: 'star',
    },
  ];

  // Calculate loyalty score (weighted average)
  const loyaltyScore = total > 0
    ? Math.round(
        ((data.oneVisit * 1 +
          data.twoToThreeVisits * 2.5 +
          data.fourToSixVisits * 5 +
          data.sevenPlusVisits * 8) /
          total) *
          10
      )
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Visitor Frequency</Text>
          <Text style={styles.subtitle}>{total} total visitors</Text>
        </View>
        <View style={styles.loyaltyBadge}>
          <Ionicons name="trophy" size={14} color="#F59E0B" />
          <Text style={styles.loyaltyScore}>{loyaltyScore}</Text>
          <Text style={styles.loyaltyLabel}>Loyalty</Text>
        </View>
      </View>

      <View style={styles.barsContainer}>
        {categories.map((cat) => (
          <BarRow
            key={cat.label}
            label={cat.label}
            count={cat.count}
            percentage={cat.percentage}
            color={cat.color}
            icon={cat.icon}
          />
        ))}
      </View>

      {total > 0 && (
        <View style={styles.insight}>
          <Ionicons name="bulb-outline" size={14} color={colors.textMuted} />
          <Text style={styles.insightText}>
            {data.sevenPlusVisits > 0
              ? `${data.sevenPlusVisits} super fan${data.sevenPlusVisits > 1 ? 's' : ''} visiting regularly!`
              : data.fourToSixVisits > 0
              ? 'Growing loyal customer base'
              : data.twoToThreeVisits > 0
              ? 'Returning visitors - keep them engaged!'
              : 'Focus on first-time visitor experience'}
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
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B20',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    gap: 4,
  },
  loyaltyScore: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  loyaltyLabel: {
    fontSize: 11,
    color: '#F59E0B',
  },
  barsContainer: {
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 90,
  },
  barIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  barLabelText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: colors.cardBgElevated,
    borderRadius: 10,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  bar: {
    height: '100%',
    borderRadius: 10,
  },
  barValue: {
    width: 50,
    alignItems: 'flex-end',
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  percentText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 8,
  },
  insightText: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  skeletonContent: {
    height: 160,
    marginTop: 12,
  },
  skeleton: {
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
  },
});
