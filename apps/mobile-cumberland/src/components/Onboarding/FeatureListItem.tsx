/**
 * FeatureListItem Component
 *
 * Consistent feature list item with icon, text, and optional checkmark.
 * Supports staggered entrance animations.
 */

import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../constants/colors';
import { duration, stagger } from '../../constants/animations';

interface FeatureListItemProps {
  icon: string;
  text: string;
  index?: number;
  showCheck?: boolean;
  checkColor?: 'accent' | 'success' | 'gold';
  iconColor?: string;
  baseDelay?: number;
}

export default function FeatureListItem({
  icon,
  text,
  index = 0,
  showCheck = true,
  checkColor = 'success',
  iconColor,
  baseDelay = 0,
}: FeatureListItemProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);
  const scale = useSharedValue(0.9);

  const checkColorMap = {
    accent: colors.accent,
    success: colors.valueGreen,
    gold: colors.gold,
  };

  const checkBgColorMap = {
    accent: `${colors.accent}20`,
    success: colors.valueGreenLight,
    gold: colors.goldLight,
  };

  useEffect(() => {
    const delay = baseDelay + index * stagger.medium;

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: duration.normal, easing: Easing.out(Easing.cubic) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(0, { duration: duration.normal, easing: Easing.out(Easing.cubic) })
    );
    scale.value = withDelay(
      delay,
      withTiming(1, { duration: duration.normal, easing: Easing.out(Easing.back(1.2)) })
    );
  }, [index, baseDelay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon as any}
          size={20}
          color={iconColor || colors.accent}
        />
      </View>
      <Text style={styles.text}>{text}</Text>
      {showCheck && (
        <View style={[styles.checkContainer, { backgroundColor: checkBgColorMap[checkColor] }]}>
          <Ionicons
            name="checkmark"
            size={14}
            color={checkColorMap[checkColor]}
          />
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    marginBottom: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
