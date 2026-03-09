import { View, Text } from 'react-native';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import type { TimeRangeMetrics, VisitMetrics } from '../../lib/restaurantInsights';

interface MetricsHeaderProps {
  metrics: TimeRangeMetrics;
}

function MetricTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </View>
  );
}

function MetricsGroup({ label, m }: { label: string; m: VisitMetrics }) {
  const styles = useStyles();
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.tiles}>
        <MetricTile label="Visits" value={m.totalVisits.toLocaleString()} />
        <MetricTile label="Unique" value={m.uniqueVisitors.toLocaleString()} />
        <MetricTile
          label="Repeat Rate"
          value={`${m.repeatRate.toFixed(1)}%`}
          sub={`${m.repeatVisitors} visitors`}
        />
      </View>
    </View>
  );
}

export function MetricsHeader({ metrics }: MetricsHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <MetricsGroup label="Last 7 Days" m={metrics.last7Days} />
      <View style={styles.divider} />
      <MetricsGroup label="Last 30 Days" m={metrics.last30Days} />
      <View style={styles.divider} />
      <MetricsGroup label="All Time" m={metrics.allTime} />
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
  group: {
    paddingVertical: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tiles: {
    flexDirection: 'row',
    gap: 8,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    padding: 10,
    alignItems: 'center',
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  tileLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  tileSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
}));
