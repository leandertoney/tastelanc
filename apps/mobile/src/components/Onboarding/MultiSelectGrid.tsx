/**
 * MultiSelectGrid Component
 *
 * Tier 2 medium selection grid for 5+ options (multi-select).
 * 2-column grid with icon, label, and checkmark badge.
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
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
            <Ionicons name="checkmark" size={14} color={colors.text} />
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
              size={28}
              color={isSelected ? colors.text : colors.accent}
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

export default function MultiSelectGrid({
  options,
  selected,
  onToggle,
  maxSelections = 3,
  baseDelay = 0,
  columns = 2,
}: MultiSelectGridProps) {
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

const styles = StyleSheet.create({
  container: {
    // No padding here - let parent screens control horizontal padding
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  gridItem: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  gridItemSelected: {
    backgroundColor: colors.cardBgSelected,
    borderColor: colors.accent,
  },
  gridItemDisabled: {
    opacity: 0.4,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircleSelected: {
    backgroundColor: colors.accent,
  },
  emoji: {
    fontSize: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.text,
  },
  labelDisabled: {
    color: colors.textSecondary,
  },
});
