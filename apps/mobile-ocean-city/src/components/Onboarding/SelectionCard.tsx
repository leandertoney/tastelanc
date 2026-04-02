/**
 * SelectionCard Component
 *
 * Tier 1 large selection card for 2-4 options (single select).
 * Full-width vertical card with icon, title, description.
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
import { duration, stagger, spring } from '../../constants/animations';

interface SelectionCardProps {
  icon: string;
  title: string;
  description?: string;
  isSelected: boolean;
  onSelect: () => void;
  index?: number;
  showGoldAccent?: boolean;
  baseDelay?: number;
  size?: 'large' | 'medium';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function SelectionCard({
  icon,
  title,
  description,
  isSelected,
  onSelect,
  index = 0,
  showGoldAccent = false,
  baseDelay = 0,
  size = 'large',
}: SelectionCardProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const borderOpacity = useSharedValue(0);

  useEffect(() => {
    const delay = baseDelay + index * stagger.medium;

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: duration.normal })
    );
    scale.value = withDelay(
      delay,
      withSpring(1, spring.default)
    );
  }, [index, baseDelay]);

  useEffect(() => {
    borderOpacity.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    borderColor: isSelected
      ? showGoldAccent
        ? colors.gold
        : colors.accent
      : 'transparent',
    borderWidth: 2,
  }));

  const iconContainerBg = isSelected
    ? showGoldAccent
      ? colors.goldLight
      : `${colors.accent}30`
    : colors.cardBgElevated;

  const iconColor = isSelected
    ? showGoldAccent
      ? colors.gold
      : colors.accent
    : colors.accent;

  return (
    <AnimatedPressable
      onPress={onSelect}
      style={[
        styles.container,
        size === 'medium' && styles.containerMedium,
        isSelected && styles.containerSelected,
        containerAnimatedStyle,
      ]}
    >
      <Animated.View style={[styles.inner, borderAnimatedStyle]}>
        <View style={[styles.iconContainer, { backgroundColor: iconContainerBg }]}>
          <Ionicons name={icon as any} size={size === 'large' ? 32 : 24} color={iconColor} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>

        {isSelected && (
          <View
            style={[
              styles.checkContainer,
              { backgroundColor: showGoldAccent ? colors.goldLight : `${colors.accent}20` },
            ]}
          >
            <Ionicons
              name="checkmark"
              size={18}
              color={showGoldAccent ? colors.gold : colors.accent}
            />
          </View>
        )}
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  containerMedium: {
    marginBottom: 10,
  },
  containerSelected: {},
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  checkContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
