import { View, Text } from 'react-native';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import type { ScoreLiftData } from '../../lib/restaurantInsights';

interface ScoreLiftCardProps {
  data: ScoreLiftData;
}

export function ScoreLiftCard({ data }: ScoreLiftCardProps) {
  const styles = useStyles();
  const colors = getColors();

  const liftPct =
    data.baseScore > 0
      ? (((data.baseScore + data.totalLift) / data.baseScore - 1) * 100).toFixed(1)
      : '0.0';

  const barWidth = Math.min((data.totalLift / Math.max(data.baseScore, 1)) * 100, 100);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommendation Score Lift</Text>
      <Text style={styles.subtitle}>
        How much app visits boost your discovery ranking
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{data.baseScore.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Base Score</Text>
        </View>
        <View style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {(data.baseScore + data.totalLift).toFixed(1)}
          </Text>
          <Text style={styles.statLabel}>Boosted Score</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.accent }]}>+{liftPct}%</Text>
          <Text style={styles.statLabel}>Lift</Text>
        </View>
      </View>

      {/* Lift bar */}
      <View style={styles.liftBarTrack}>
        <View
          style={[styles.liftBar, { width: `${barWidth}%` as any, backgroundColor: colors.accent }]}
        />
      </View>

      <Text style={styles.caption}>
        {data.visitorsWithBoost.toLocaleString()} visitors contributed +{data.visitBoostAvg.toFixed(2)} avg boost each
      </Text>
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    padding: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  arrow: {
    alignItems: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: colors.textMuted,
  },
  liftBarTrack: {
    height: 8,
    backgroundColor: colors.cardBgElevated,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  liftBar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 8,
  },
  caption: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));
