import { ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useUserBadges } from '../hooks/useUserBadges';
import type { Badge } from '../types/retention';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

function BadgeChip({ badge, earned }: { badge: Badge; earned: boolean }) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={[styles.chip, { opacity: earned ? 1 : 0.35 }]}>
      <View style={[styles.circle, earned && styles.circleEarned]}>
        <Ionicons
          name={badge.icon_name as any}
          size={26}
          color={earned ? colors.textOnAccent : colors.textSecondary}
        />
      </View>
      <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
    </View>
  );
}

export default function BadgesSection() {
  const { data } = useUserBadges();

  if (!data) return null;
  const { allBadges, earnedBadgeIds } = data;
  if (earnedBadgeIds.size === 0) return null;

  return (
    <View style={useStyles().container}>
      <View style={useStyles().headerRow}>
        <Text style={useStyles().title}>My Badges</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
      >
        {allBadges.map((badge) => (
          <BadgeChip key={badge.id} badge={badge} earned={earnedBadgeIds.has(badge.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    container: {
      marginBottom: spacing.sm,
    },
    headerRow: {
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    chip: {
      width: 72,
      alignItems: 'center',
      gap: 6,
    },
    circle: {
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: (colors as any).cardBgElevated ?? colors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circleEarned: {
      backgroundColor: colors.accent,
    },
    badgeName: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 13,
    },
  };
});
