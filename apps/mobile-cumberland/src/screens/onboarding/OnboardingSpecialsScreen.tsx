import { useEffect } from 'react';
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
import { BRAND } from '../../config/brand';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSpecials'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingSpecialsScreen({ navigation }: Props) {
  const iconScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(30);
  const glowOpacity = useSharedValue(0.3);
  const sparkleRotate = useSharedValue(0);
  const tagBounce = useSharedValue(0);

  useEffect(() => {
    // Icon entrance with spring physics
    iconScale.value = withDelay(reveal.content, withSpring(1, spring.default));

    // Text entrance with consistent timing
    textOpacity.value = withDelay(reveal.items, withTiming(1, { duration: duration.normal }));
    textTranslate.value = withDelay(reveal.items, withSpring(0, spring.default));

    // Glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: pulse.duration / 2 }),
        withTiming(0.3, { duration: pulse.duration / 2 })
      ),
      -1,
      true
    );

    // Sparkle rotation - slowed down for smoother feel
    sparkleRotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );

    // Tag bounce
    tagBounce.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 800, easing: Easing.sin }),
        withTiming(6, { duration: 800, easing: Easing.sin })
      ),
      -1,
      true
    );
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.6], [1, 1.15]) }],
  }));

  const sparkleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
  }));

  const tagAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: tagBounce.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingUserType');
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
              <Ionicons name="pricetag" size={80} color={colors.accent} />
            </Animated.View>

            {/* Floating sparkles around */}
            <Animated.View style={[styles.sparkleOrbit, sparkleAnimatedStyle]}>
              <View style={[styles.sparkle, styles.sparkle1]}>
                <Ionicons name="sparkles" size={20} color={colors.accent} />
              </View>
              <View style={[styles.sparkle, styles.sparkle2]}>
                <Ionicons name="star" size={18} color={colors.accent} />
              </View>
              <View style={[styles.sparkle, styles.sparkle3]}>
                <Ionicons name="sparkles" size={16} color={colors.accent} />
              </View>
            </Animated.View>

            {/* Floating deal tags */}
            <Animated.View style={[styles.floatingTag, styles.tagLeft, tagAnimatedStyle]}>
              <Text style={styles.tagText}>2 for 1</Text>
            </Animated.View>
            <Animated.View style={[styles.floatingTag, styles.tagRight, tagAnimatedStyle]}>
              <Text style={styles.tagText}>$5 Apps</Text>
            </Animated.View>
          </View>

          {/* Text Content */}
          <Animated.View style={[styles.textContent, textAnimatedStyle]}>
            <Text style={styles.headline}>Daily Deals, Weekly Picks</Text>
            <Text style={styles.subheadline}>
              {`Special deals picked\njust for ${BRAND.cityName}.`}
            </Text>
          </Animated.View>
        </View>

        {/* Bottom Section */}
        <View style={styles.footer}>
          <View style={styles.pagination}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
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
    backgroundColor: '#FEF6E7',
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
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
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
  sparkleOrbit: {
    position: 'absolute',
    width: 240,
    height: 240,
  },
  sparkle: {
    position: 'absolute',
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    padding: 8,
  },
  sparkle1: {
    top: 0,
    left: '50%',
    marginLeft: -16,
  },
  sparkle2: {
    bottom: 20,
    left: 20,
  },
  sparkle3: {
    bottom: 20,
    right: 20,
  },
  floatingTag: {
    position: 'absolute',
    backgroundColor: colors.valueGreen,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  tagLeft: {
    left: -10,
    top: '40%',
  },
  tagRight: {
    right: -10,
    bottom: '35%',
  },
  tagText: {
    color: colors.text,
    fontSize: 13,
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
