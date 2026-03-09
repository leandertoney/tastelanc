import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import type { NearbyDensity } from '../../lib/restaurantInsights';

interface NearbyDensityCardProps {
  data: NearbyDensity;
}

const DENSITY_CONFIG = {
  low: { label: 'Low Activity', icon: 'radio-button-off-outline' as const, colorKey: 'textMuted' },
  medium: { label: 'Moderate Activity', icon: 'radio-button-on-outline' as const, colorKey: 'accent' },
  high: { label: 'High Activity', icon: 'pulse-outline' as const, colorKey: 'cta' },
};

export function NearbyDensityCard({ data }: NearbyDensityCardProps) {
  const styles = useStyles();
  const colors = getColors();

  const config = DENSITY_CONFIG[data.densityLevel];
  const indicatorColor = data.densityLevel === 'high'
    ? colors.accent
    : data.densityLevel === 'medium'
    ? colors.accent
    : colors.textMuted;

  const radiusLabel =
    data.radiusMeters >= 1000
      ? `${(data.radiusMeters / 1000).toFixed(1)} km`
      : `${data.radiusMeters} m`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nearby Visitor Density</Text>
      <Text style={styles.subtitle}>
        Area activity within {radiusLabel} radius in last 24 hours
      </Text>

      <View style={styles.statusRow}>
        <Ionicons name={config.icon} size={28} color={indicatorColor} />
        <Text style={[styles.statusLabel, { color: indicatorColor }]}>
          {config.label}
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{data.recentVisitors.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Recent Visitors</Text>
          <Text style={styles.statSub}>in area last 24h</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statValue}>{data.potentialReach.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Potential Reach</Text>
          <Text style={styles.statSub}>nearby app users</Text>
        </View>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    padding: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCell: {
    flex: 1,
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  statSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
}));
