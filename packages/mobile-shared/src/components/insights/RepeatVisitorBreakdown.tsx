import { View, Text } from 'react-native';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import type { RepeatVisitorBreakdown as RepeatData } from '../../lib/restaurantInsights';

interface RepeatVisitorBreakdownProps {
  data: RepeatData;
}

export function RepeatVisitorBreakdown({ data }: RepeatVisitorBreakdownProps) {
  const styles = useStyles();
  const colors = getColors();

  const total = data.oneVisit + data.twoToThreeVisits + data.fourToSixVisits + data.sevenPlusVisits;
  if (total === 0) return null;

  const segments = [
    { label: '1 visit', count: data.oneVisit, color: colors.textMuted },
    { label: '2–3 visits', count: data.twoToThreeVisits, color: colors.accent },
    { label: '4–6 visits', count: data.fourToSixVisits, color: colors.accent },
    { label: '7+ visits', count: data.sevenPlusVisits, color: '#FFD700' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Repeat Visitor Breakdown</Text>
      <Text style={styles.subtitle}>{total.toLocaleString()} total unique visitors</Text>

      {/* Bar chart */}
      <View style={styles.barRow}>
        {segments.map((s) => {
          const pct = total > 0 ? (s.count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <View
              key={s.label}
              style={[styles.barSegment, { flex: pct, backgroundColor: s.color }]}
            />
          );
        })}
      </View>

      {/* Legend */}
      {segments.map((s) => {
        const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0.0';
        return (
          <View key={s.label} style={styles.legendRow}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendLabel}>{s.label}</Text>
            <Text style={styles.legendCount}>{s.count.toLocaleString()}</Text>
            <Text style={styles.legendPct}>{pct}%</Text>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  barRow: {
    flexDirection: 'row',
    height: 16,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: 16,
    gap: 2,
  },
  barSegment: {
    borderRadius: 2,
    minWidth: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  legendCount: {
    fontSize: 13,
    color: colors.textMuted,
    width: 60,
    textAlign: 'right',
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    width: 48,
    textAlign: 'right',
  },
}));
