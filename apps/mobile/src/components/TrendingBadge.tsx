import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../constants/colors';

export type BadgeType = 'trending' | 'top_pick' | 'rising' | 'popular' | 'new_votes';

interface TrendingBadgeProps {
  type?: BadgeType;
  text?: string;
  size?: 'small' | 'medium';
}

/**
 * TrendingBadge - Shows social proof indicators on restaurant cards
 *
 * Types:
 * - trending: General trending indicator (fire emoji)
 * - top_pick: #1 in a category (trophy)
 * - rising: Gaining momentum (arrow up)
 * - popular: High engagement (star)
 * - new_votes: Recently voted (ballot)
 */
export default function TrendingBadge({ type = 'trending', text, size = 'small' }: TrendingBadgeProps) {
  const getConfig = () => {
    switch (type) {
      case 'top_pick':
        return {
          emoji: '',
          label: text || 'Top Pick',
          bgColor: colors.goldLight,
          borderColor: colors.goldBorder,
          textColor: colors.gold,
        };
      case 'trending':
        return {
          emoji: '',
          label: text || 'Trending',
          bgColor: 'rgba(255, 149, 0, 0.15)',
          borderColor: 'rgba(255, 149, 0, 0.3)',
          textColor: '#FF9500',
        };
      case 'rising':
        return {
          emoji: '',
          label: text || 'Rising',
          bgColor: colors.valueGreenLight,
          borderColor: colors.valueGreenBorder,
          textColor: colors.valueGreen,
        };
      case 'popular':
        return {
          emoji: '',
          label: text || 'Popular',
          bgColor: 'rgba(164, 30, 34, 0.15)',
          borderColor: 'rgba(164, 30, 34, 0.3)',
          textColor: colors.accent,
        };
      case 'new_votes':
        return {
          emoji: '',
          label: text || 'Voted',
          bgColor: 'rgba(10, 132, 255, 0.15)',
          borderColor: 'rgba(10, 132, 255, 0.3)',
          textColor: colors.info,
        };
      default:
        return {
          emoji: '',
          label: text || 'Trending',
          bgColor: 'rgba(255, 149, 0, 0.15)',
          borderColor: 'rgba(255, 149, 0, 0.3)',
          textColor: '#FF9500',
        };
    }
  };

  const config = getConfig();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 8,
        },
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: config.textColor,
            fontSize: isSmall ? 10 : 12,
          },
        ]}
      >
        {config.emoji} {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.xs,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});
