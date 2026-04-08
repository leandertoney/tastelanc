import { useCallback } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { useChallenges } from '../hooks/useChallenges';
import type { ChallengeWithProgress } from '../types/retention';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

function ProgressBar({ progress, target }: { progress: number; target: number }) {
  const colors = getColors();
  const pct = Math.min(1, target > 0 ? progress / target : 0);
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.cardBgElevated ?? colors.cardBg, overflow: 'hidden' }}>
      <View style={{ height: 4, width: `${pct * 100}%`, borderRadius: 2, backgroundColor: colors.accent }} />
    </View>
  );
}

function ChallengeCard({ item }: { item: ChallengeWithProgress }) {
  const styles = useStyles();
  const colors = getColors();
  const progressCount = item.progress?.progress_count ?? 0;
  const isComplete = !!item.progress?.completed_at;

  return (
    <View style={[styles.card, isComplete && styles.cardComplete]}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon_name as any} size={20} color={isComplete ? colors.textOnAccent : colors.accent} />
        </View>
        {isComplete && (
          <View style={styles.completeBadge}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      <Spacer size="xs" />
      <ProgressBar progress={progressCount} target={item.target_count} />
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          {isComplete ? 'Complete!' : `${progressCount} / ${item.target_count}`}
        </Text>
        {item.resets_weekly && <Text style={styles.weeklyBadge}>Weekly</Text>}
      </View>
      {item.sponsor_restaurant && item.reward_description && (
        <Text style={styles.sponsorLabel} numberOfLines={1}>
          🎁 Reward by {item.sponsor_restaurant.name}
        </Text>
      )}
    </View>
  );
}

export default function ChallengesSection() {
  const { data: challenges = [], isLoading } = useChallenges();

  if (!isLoading && challenges.length === 0) return null;
  if (isLoading) return <View style={{ height: 0 }} />;

  const keyExtractor = useCallback((item: ChallengeWithProgress) => item.id, []);
  const renderItem = useCallback(({ item }: { item: ChallengeWithProgress }) => (
    <ChallengeCard item={item} />
  ), []);

  return (
    <View>
      <SectionHeader title="Challenges" />
      <Spacer size="sm" />
      <FlatList
        data={challenges}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
      />
    </View>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    card: {
      width: 195,
      backgroundColor: colors.cardBg,
      borderRadius: radius.md,
      padding: spacing.sm,
      gap: 4,
    },
    cardComplete: {
      borderWidth: 1,
      borderColor: colors.accent,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: (colors as any).cardBgElevated ?? colors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    completeBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    description: {
      fontSize: 11,
      color: colors.textSecondary,
      lineHeight: 15,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    progressLabel: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    weeklyBadge: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.accent,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sponsorLabel: {
      fontSize: 10,
      color: '#F0C040',
      marginTop: 2,
    },
  };
});
