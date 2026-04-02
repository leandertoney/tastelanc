/**
 * GoldGlowContainer Component
 *
 * Wraps content with an animated gold glow effect.
 * Used for premium/achievement emphasis.
 */

import { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors } from '../../constants/colors';
import { pulse } from '../../constants/animations';

interface GoldGlowContainerProps {
  children: React.ReactNode;
  glowIntensity?: 'subtle' | 'medium' | 'strong';
  pulseEnabled?: boolean;
  pulseCount?: number;
  delay?: number;
  style?: ViewStyle;
  glowSize?: number;
}

export default function GoldGlowContainer({
  children,
  glowIntensity = 'medium',
  pulseEnabled = true,
  pulseCount = 3,
  delay = 0,
  style,
  glowSize = 20,
}: GoldGlowContainerProps) {
  const glowOpacity = useSharedValue(0);

  const intensityMap = {
    subtle: { min: 0.1, max: 0.25 },
    medium: { min: 0.2, max: 0.4 },
    strong: { min: 0.3, max: 0.6 },
  };

  const { min, max } = intensityMap[glowIntensity];

  useEffect(() => {
    if (pulseEnabled) {
      glowOpacity.value = withDelay(
        delay,
        withSequence(
          withTiming(max, { duration: pulse.duration / 2, easing: Easing.inOut(Easing.ease) }),
          withRepeat(
            withSequence(
              withTiming(min, { duration: pulse.duration / 2 }),
              withTiming(max, { duration: pulse.duration / 2 })
            ),
            pulseCount - 1,
            false
          ),
          withTiming(min, { duration: pulse.duration / 2 })
        )
      );
    } else {
      glowOpacity.value = withDelay(
        delay,
        withTiming(max, { duration: 400 })
      );
    }
  }, [delay, pulseEnabled, pulseCount]);

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.glow,
          {
            top: -glowSize,
            left: -glowSize,
            right: -glowSize,
            bottom: -glowSize,
            borderRadius: 999,
          },
          glowAnimatedStyle,
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    backgroundColor: colors.gold,
    zIndex: -1,
  },
});
