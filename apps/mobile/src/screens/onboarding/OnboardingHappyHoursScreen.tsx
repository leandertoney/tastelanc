import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors, radius } from '../../constants/colors';
import { duration, spring, reveal, pulse } from '../../constants/animations';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingHappyHours'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingHappyHoursScreen({ navigation }: Props) {
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(30);
  const glowOpacity = useSharedValue(0.3);
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Icon entrance animation with spring physics
    iconScale.value = withDelay(reveal.content, withSpring(1, spring.default));
    iconRotate.value = withDelay(reveal.content, withTiming(360, { duration: duration.slow, easing: Easing.out(Easing.cubic) }));

    // Text entrance with consistent timing
    textOpacity.value = withDelay(reveal.items, withTiming(1, { duration: duration.normal }));
    textTranslate.value = withDelay(reveal.items, withSpring(0, spring.default));

    // Continuous glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: pulse.duration / 2 }),
        withTiming(0.3, { duration: pulse.duration / 2 })
      ),
      -1,
      true
    );

    // Floating animation
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.sin }),
        withTiming(10, { duration: 2000, easing: Easing.sin })
      ),
      -1,
      true
    );
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
      { translateY: floatY.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.6], [1, 1.2]) }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingEvents');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleContinue}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Animated Icon Section */}
          <View style={styles.iconSection}>
            <Animated.View style={[styles.glowCircle, glowAnimatedStyle]} />
            <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
              <Ionicons name="beer" size={80} color={colors.accent} />
            </Animated.View>

            {/* Floating elements */}
            <Animated.View style={[styles.floatingElement, styles.floatLeft, iconAnimatedStyle]}>
              <Ionicons name="time" size={32} color={colors.accent} />
            </Animated.View>
            <Animated.View style={[styles.floatingElement, styles.floatRight, styles.dealBadge, iconAnimatedStyle]}>
              <Text style={styles.dealText}>50% OFF</Text>
            </Animated.View>
          </View>

          {/* Text Content */}
          <Animated.View style={[styles.textContent, textAnimatedStyle]}>
            <Text style={styles.headline}>Happy Hour Finds You</Text>
            <Text style={styles.subheadline}>
              Real-time deals from your favorite spots.{'\n'}
              No searching required.
            </Text>
          </Animated.View>
        </View>

        {/* Bottom Section */}
        <View style={styles.footer}>
          <View style={styles.pagination}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        </View>
      </SafeAreaView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconSection: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  floatingElement: {
    position: 'absolute',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatLeft: {
    left: 0,
    top: '30%',
  },
  floatRight: {
    right: 0,
    bottom: '30%',
  },
  dealBadge: {
    backgroundColor: colors.valueGreen,
  },
  dealText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  textContent: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subheadline: {
    fontSize: 17,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  pagination: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  tapHint: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
