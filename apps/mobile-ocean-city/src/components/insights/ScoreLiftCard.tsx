/**
 * Score Lift Card Component
 *
 * Displays recommendation score boost from visit data
 */

import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
import type { ScoreLiftData } from '../../lib/restaurantInsights';

interface ScoreLiftCardProps {
  data: ScoreLiftData;
  isLoading?: boolean;
}

export default function ScoreLiftCard({ data, isLoading }: ScoreLiftCardProps) {
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.skeletonContent, styles.skeleton]} />
      </View>
    );
  }

  const totalScore = data.baseScore + data.visitBoostAvg;
  const boostPercentage = data.baseScore > 0 ? (data.visitBoostAvg / data.baseScore) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="trending-up" size={20} color="#10B981" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Recommendation Score</Text>
          <Text style={styles.subtitle}>
            How visits boost your ranking
          </Text>
        </View>
      </View>

      <View style={styles.scoreDisplay}>
        <View style={styles.scoreSection}>
          <Text style={styles.scoreLabel}>Base Score</Text>
          <Text style={styles.baseScore}>{data.baseScore}</Text>
        </View>

        <View style={styles.plusSign}>
          <Ionicons name="add" size={20} color={colors.textMuted} />
        </View>

        <View style={styles.scoreSection}>
          <Text style={styles.scoreLabel}>Visit Boost</Text>
          <Text style={styles.boostScore}>+{data.visitBoostAvg.toFixed(1)}</Text>
        </View>

        <View style={styles.equalsSign}>
          <Text style={styles.equalsText}>=</Text>
        </View>

        <View style={styles.scoreSection}>
          <Text style={styles.scoreLabel}>Total</Text>
          <Text style={styles.totalScore}>{totalScore.toFixed(1)}</Text>
        </View>
      </View>

      <View style={styles.boostBar}>
        <View style={styles.boostBarBase}>
          <View
            style={[
              styles.boostBarFill,
              { width: `${Math.min((data.baseScore / 10) * 100, 100)}%` },
            ]}
          />
          <View
            style={[
              styles.boostBarLift,
              {
                width: `${Math.min((data.visitBoostAvg / 10) * 100, 100)}%`,
                left: `${Math.min((data.baseScore / 10) * 100, 100)}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{data.visitorsWithBoost}</Text>
          <Text style={styles.statLabel}>Active visitors</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {boostPercentage > 0 ? `+${boostPercentage.toFixed(0)}%` : '0%'}
          </Text>
          <Text style={styles.statLabel}>Score lift</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>+20</Text>
          <Text style={styles.statLabel}>Max boost</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.infoText}>
          Each visit adds +5 to a user's recommendation score for your restaurant (max +20).
          More visits = higher ranking in their personalized feed.
        </Text>
      </View>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
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
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
    marginBottom: 12,
  },
  scoreSection: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  baseScore: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  boostScore: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  totalScore: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
  },
  plusSign: {
    paddingHorizontal: 4,
  },
  equalsSign: {
    paddingHorizontal: 8,
  },
  equalsText: {
    fontSize: 20,
    color: colors.textMuted,
  },
  boostBar: {
    marginBottom: 16,
  },
  boostBarBase: {
    height: 8,
    backgroundColor: colors.cardBgElevated,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  boostBarFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: colors.textMuted,
    borderRadius: 4,
  },
  boostBarLift: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#10B981',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.cardBgElevated,
    padding: 12,
    borderRadius: radius.sm,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  skeletonContent: {
    height: 200,
  },
  skeleton: {
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.sm,
  },
});
