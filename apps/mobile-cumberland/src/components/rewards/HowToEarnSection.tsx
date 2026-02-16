import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/colors';
import { POINT_VALUES, ACTION_ICONS, ACTION_LABELS, type RewardActionType } from '../../lib/rewards';

const EARN_ACTIONS: RewardActionType[] = [
  'checkin',
  'review',
  'photo',
  'share',
  'event',
  'referral',
];

function EarnItem({ action }: { action: RewardActionType }) {
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  itemsContainer: {
    gap: spacing.sm,
  },
  earnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  earnItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  earnItemLabel: {
    fontSize: 14,
    color: colors.text,
  },
  earnItemPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
});
