import { View, Text } from 'react-native';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import type { HourlyDistribution } from '../../lib/restaurantInsights';

interface PeakHoursHeatmapProps {
  data: HourlyDistribution[];
}

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

export function PeakHoursHeatmap({ data }: PeakHoursHeatmapProps) {
  const styles = useStyles();
  const colors = getColors();

  if (!data || data.length === 0) return null;

  const maxPct = Math.max(...data.map((d) => d.percentage), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Peak Hours</Text>
      <Text style={styles.subtitle}>Busiest times of day across all visits</Text>
      <View style={styles.grid}>
        {data.map((item) => {
          const intensity = item.percentage / maxPct;
          const bg = `rgba(${hexToRgb(colors.accent)}, ${0.1 + intensity * 0.85})`;
          return (
            <View key={item.hour} style={styles.cell}>
              <View style={[styles.block, { backgroundColor: bg }]}>
                {intensity > 0.5 && (
                  <Text style={styles.blockValue}>{item.visits}</Text>
                )}
              </View>
              <Text style={styles.hourLabel}>{formatHour(item.hour)}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>Low</Text>
        <View style={styles.scaleBar}>
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((op) => (
            <View
              key={op}
              style={[
                styles.scaleSegment,
                { backgroundColor: `rgba(${hexToRgb(colors.accent)}, ${op})` },
              ]}
            />
          ))}
        </View>
        <Text style={styles.scaleLabel}>High</Text>
      </View>
    </View>
  );
}

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  cell: {
    width: '11.5%',
    alignItems: 'center',
  },
  block: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockValue: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.text,
  },
  hourLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 2,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  scaleLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  scaleBar: {
    flex: 1,
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  scaleSegment: {
    flex: 1,
  },
}));
