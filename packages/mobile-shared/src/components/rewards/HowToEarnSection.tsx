import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius, spacing } from '../../constants/spacing';
import { POINT_VALUES, ACTION_ICONS, ACTION_LABELS, type RewardActionType } from '../../lib/rewards';

const EARN_ACTIONS: RewardActionType[] = [
  'video_recommendation',
  'checkin',
  'review',
];

function EarnItem({ action }: { action: RewardActionType }) {
  const styles = useStyles();
  const colors = getColors();
  const basePoints = POINT_VALUES[action];
  const iconName = ACTION_ICONS[action] || 'star';
  const label = ACTION_LABELS[action] || action;

  return (
    <View style={styles.earnItem}>
      <View style={styles.earnItemLeft}>
        <Ionicons name={iconName as any} size={16} color={colors.accent} />
        <Text style={styles.earnItemLabel}>{label}</Text>
      </View>
      <Text style={styles.earnItemPoints}>+{basePoints}</Text>
    </View>
  );
}

export default function HowToEarnSection() {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="star" size={18} color={colors.gold} />
        <Text style={styles.title}>How to Earn</Text>
      </View>

      <View style={styles.itemsContainer}>
        {EARN_ACTIONS.map((action) => (
          <EarnItem key={action} action={action} />
        ))}
      </View>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    flex: 1,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  earnItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing.xs,
  },
  earnItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  earnItemLabel: {
    fontSize: 14,
    color: colors.text,
  },
  earnItemPoints: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
}));
