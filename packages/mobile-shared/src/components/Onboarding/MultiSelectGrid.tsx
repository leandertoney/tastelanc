/**
 * MultiSelectGrid Component
 *
 * Tier 2 medium selection grid for 5+ options (multi-select).
 * 2-column grid with icon, label, and checkmark badge.
 */

import { useEffect } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import { duration, stagger, spring } from '../../constants/animations';

interface GridOption {
  id: string;
  label: string;
  icon: string;
  emoji?: string;
}

interface MultiSelectGridProps {
  options: GridOption[];
  selected: string[];
  onToggle: (id: string) => void;
  maxSelections?: number;
  baseDelay?: number;
  columns?: 2 | 3 | 4;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING = 24;
const GAP = 12;

interface GridItemProps {
  option: GridOption;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: () => void;
  index: number;
  baseDelay: number;
  itemWidth: number;
}

function GridItem({
  option,
  isSelected,
  isDisabled,
  onPress,
  index,
  baseDelay,
  itemWidth,
}: GridItemProps) {
  const styles = useStyles();
  const colors = getColors();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    const delay = baseDelay + index * stagger.short;

    opacity.value = withDelay(delay, withTiming(1, { duration: duration.normal }));
    scale.value = withDelay(delay, withSpring(1, spring.default));
  }, [index, baseDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ width: itemWidth }, animatedStyle]}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled && !isSelected}
        style={[
          styles.gridItem,
          isSelected && styles.gridItemSelected,
          isDisabled && !isSelected && styles.gridItemDisabled,
        ]}
      >
        {isSelected && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
          </View>
        )}

        <View
          style={[
            styles.iconCircle,
            isSelected && styles.iconCircleSelected,
          ]}
        >
          {option.emoji ? (
            <Text style={styles.emoji}>{option.emoji}</Text>
          ) : (
            <Ionicons
              name={option.icon as any}
              size={24}
              color={isSelected ? colors.textOnAccent : colors.accent}
            />
          )}
        </View>

        <Text
          style={[
            styles.label,
            isSelected && styles.labelSelected,
            isDisabled && !isSelected && styles.labelDisabled,
          ]}
          numberOfLines={2}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    // No padding here - let parent screens control horizontal padding
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: GAP,
  },
  gridItem: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 14,
    height: 120,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative' as const,
  },
  gridItemSelected: {
    backgroundColor: colors.cardBgSelected,
    borderColor: colors.accent,
  },
  gridItemDisabled: {
    opacity: 0.4,
  },
  checkBadge: {
    position: 'absolute' as const,
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  iconCircleSelected: {
    backgroundColor: colors.accent,
  },
  emoji: {
    fontSize: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  labelSelected: {
    color: colors.text,
  },
  labelDisabled: {
    color: colors.textSecondary,
  },
}));

export default function MultiSelectGrid({
  options,
  selected,
  onToggle,
  maxSelections = 3,
  baseDelay = 0,
  columns = 2,
}: MultiSelectGridProps) {
  const styles = useStyles();
  const itemWidth = (SCREEN_WIDTH - PADDING * 2 - GAP * (columns - 1)) / columns;
  const isMaxReached = selected.length >= maxSelections;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {options.map((option, index) => (
          <GridItem
            key={option.id}
            option={option}
            isSelected={selected.includes(option.id)}
            isDisabled={isMaxReached}
            onPress={() => onToggle(option.id)}
            index={index}
            baseDelay={baseDelay}
            itemWidth={itemWidth}
          />
        ))}
      </View>
    </View>
  );
}
