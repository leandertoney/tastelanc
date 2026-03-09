import { View, Text } from 'react-native';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import type { DailyVisitTrend } from '../../lib/restaurantInsights';

interface VisitTrendGraphProps {
  data: DailyVisitTrend[];
}

export function VisitTrendGraph({ data }: VisitTrendGraphProps) {
  const styles = useStyles();
  const colors = getColors();

  if (!data || data.length === 0) return null;

  const maxVisits = Math.max(...data.map((d) => d.visits), 1);
  // Show last 14 days at most to keep bars readable
  const visible = data.slice(-14);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Visit Trend (Last 30 Days)</Text>
      <View style={styles.chart}>
        {visible.map((day) => {
          const heightPct = (day.visits / maxVisits) * 100;
          const label = new Date(day.date).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
          });
          return (
            <View key={day.date} style={styles.barWrapper}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(heightPct, 4)}%` as any,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.legend}>
        <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
        <Text style={styles.legendText}>Total visits per day</Text>
      </View>
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
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
  },
  barTrack: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 2,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textMuted,
  },
}));
