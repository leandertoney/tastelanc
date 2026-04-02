import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../../constants/colors';

interface PointsBalanceCardProps {
  totalPoints: number;
  lifetimePoints: number;
  isLoading: boolean;
}

export default function PointsBalanceCard({
  totalPoints,
  lifetimePoints,
  isLoading,
}: PointsBalanceCardProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainRow}>
        {/* Points Display */}
        <View style={styles.pointsSection}>
          <Ionicons name="star" size={24} color={colors.gold} />
          <Text style={styles.pointsValue}>{totalPoints.toLocaleString()}</Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>

        <View style={styles.divider} />

        {/* Lifetime */}
        <View style={styles.lifetimeSection}>
          <Text style={styles.lifetimeValue}>{lifetimePoints.toLocaleString()}</Text>
          <Text style={styles.lifetimeLabel}>lifetime</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  pointsLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  lifetimeSection: {
    alignItems: 'center',
    flex: 1,
  },
  lifetimeValue: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
  },
  lifetimeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
