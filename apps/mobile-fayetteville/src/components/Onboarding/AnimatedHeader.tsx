/**
 * AnimatedHeader Component
 *
 * Consistent staggered header with fade + slide up animation.
 * Optionally includes gold glow effect for premium screens.
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
import { colors, radius } from '../../constants/colors';
import { duration, reveal, easing } from '../../constants/animations';

interface AnimatedHeaderProps {
  headline: string;
  subheadline?: string;
  icon?: React.ReactNode;
  showGoldGlow?: boolean;
  iconSize?: number;
  delay?: number;
}

export default function AnimatedHeader({
  headline,
  subheadline,
  icon,
  showGoldGlow = false,
  iconSize = 100,
  delay = 0,
}: AnimatedHeaderProps) {
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.8);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslateY = useSharedValue(20);
  const subheadlineOpacity = useSharedValue(0);
  const subheadlineTranslateY = useSharedValue(20);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    const baseDelay = delay;

    // Icon entrance
    if (icon) {
      iconOpacity.value = withDelay(
        baseDelay + reveal.header,
        withTiming(1, { duration: duration.entrance, easing: Easing.out(Easing.cubic) })
      );
      iconScale.value = withDelay(
        baseDelay + reveal.header,
        withTiming(1, { duration: duration.entrance, easing: Easing.out(Easing.back(1.5)) })
      );
    }

    // Headline entrance
    headlineOpacity.value = withDelay(
      baseDelay + reveal.content,
      withTiming(1, { duration: duration.entrance, easing: Easing.out(Easing.cubic) })
    );
    headlineTranslateY.value = withDelay(
      baseDelay + reveal.content,
      withTiming(0, { duration: duration.entrance, easing: Easing.out(Easing.cubic) })
    );

    // Subheadline entrance
    if (subheadline) {
      subheadlineOpacity.value = withDelay(
        baseDelay + reveal.content + 100,
        withTiming(1, { duration: duration.entrance, easing: Easing.out(Easing.cubic) })
      );
      subheadlineTranslateY.value = withDelay(
        baseDelay + reveal.content + 100,
        withTiming(0, { duration: duration.entrance, easing: Easing.out(Easing.cubic) })
      );
    }

    // Gold glow
    if (showGoldGlow) {
      glowOpacity.value = withDelay(
        baseDelay + reveal.content + 200,
        withTiming(1, { duration: duration.slow })
      );
    }
  }, [delay]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  const headlineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslateY.value }],
  }));

  const subheadlineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subheadlineOpacity.value,
    transform: [{ translateY: subheadlineTranslateY.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconWrapper}>
          {showGoldGlow && (
            <Animated.View
              style={[
                styles.goldGlow,
                { width: iconSize + 40, height: iconSize + 40 },
                glowAnimatedStyle,
              ]}
            />
          )}
          <Animated.View
            style={[
              styles.iconContainer,
              { width: iconSize, height: iconSize, borderRadius: iconSize / 2 },
              showGoldGlow && styles.iconContainerGold,
              iconAnimatedStyle,
            ]}
          >
            {icon}
          </Animated.View>
        </View>
      )}

      <Animated.Text style={[styles.headline, headlineAnimatedStyle]}>
        {headline}
      </Animated.Text>

      {subheadline && (
        <Animated.Text style={[styles.subheadline, subheadlineAnimatedStyle]}>
          {subheadline}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  goldGlow: {
    position: 'absolute',
    backgroundColor: colors.gold,
    borderRadius: 999,
    opacity: 0.2,
  },
  iconContainer: {
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerGold: {
    borderWidth: 2,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldLight,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
