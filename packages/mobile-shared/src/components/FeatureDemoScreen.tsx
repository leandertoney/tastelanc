/**
 * Immersive onboarding feature screen wrapper.
 * Full-bleed, Spotify Wrapped-style: gradient backgrounds, floating elements,
 * dramatic typography, haptic feedback on transitions.
 */
import { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import OnboardingProgressBar from './OnboardingProgressBar';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeatureDemoScreenProps {
  /** Large headline — keep it punchy (3-5 words) */
  headline: string;
  /** Supporting text — 1-2 lines max */
  subheadline: string;
  /** Gradient colors for the background wash [top, middle, bottom] */
  gradientColors: [string, string, string];
  /** Color for the headline drop shadow (accent color) */
  headlineShadowColor?: string;
  progressStep: number;
  totalProgressSteps: number;
  onContinue: () => void;
  /** The immersive visual content — floating cards, icons, etc. */
  children: React.ReactNode;
}

export default function FeatureDemoScreen({
  headline,
  subheadline,
  gradientColors,
  headlineShadowColor,
  progressStep,
  totalProgressSteps,
  onContinue,
  children,
}: FeatureDemoScreenProps) {
  const styles = useStyles();
  const colors = getColors();

  // Entrance animations
  const headlineOpacity = useSharedValue(0);
  const headlineTranslate = useSharedValue(40);
  const headlineScale = useSharedValue(0.85);
  const subOpacity = useSharedValue(0);
  const subTranslate = useSharedValue(20);
  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.92);
  const footerOpacity = useSharedValue(0);

  // Ambient floating animation for the whole content area
  const floatY = useSharedValue(0);

  useEffect(() => {
    // Dramatic headline entrance
    headlineOpacity.value = withDelay(100, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    headlineTranslate.value = withDelay(100, withSpring(0, { damping: 14, stiffness: 80 }));
    headlineScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 80 }));

    // Subheadline slides in
    subOpacity.value = withDelay(350, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    subTranslate.value = withDelay(350, withSpring(0, { damping: 18, stiffness: 100 }));

    // Content area fades and scales in
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    contentScale.value = withDelay(200, withSpring(1, { damping: 16, stiffness: 90 }));

    // Footer
    footerOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    // Gentle ambient float
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(6, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [
      { translateY: headlineTranslate.value },
      { scale: headlineScale.value },
    ],
  }));

  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateY: subTranslate.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { scale: contentScale.value },
      { translateY: floatY.value },
    ],
  }));

  const footerStyle = useAnimatedStyle(() => ({ opacity: footerOpacity.value }));

  const handlePress = useCallback(() => {
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onContinue();
  }, [onContinue]);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={handlePress}>
      {/* Full-bleed gradient background */}
      <LinearGradient
        colors={gradientColors}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      {/* Progress bar at very top */}
      <View style={styles.progressContainer}>
        <OnboardingProgressBar
          totalSteps={totalProgressSteps}
          currentStep={progressStep}
          style={{ paddingHorizontal: 20, paddingTop: 12 }}
        />
      </View>

      {/* Main content area */}
      <View style={styles.mainContent}>
        {/* Headline section — top third */}
        <View style={styles.headlineSection}>
          <Animated.Text
            style={[
              styles.headline,
              headlineStyle,
              headlineShadowColor && {
                textShadowColor: headlineShadowColor,
              },
            ]}
          >
            {headline}
          </Animated.Text>
          <Animated.Text style={[styles.subheadline, subStyle]}>
            {subheadline}
          </Animated.Text>
        </View>

        {/* Visual content — floats in the center */}
        <Animated.View style={[styles.visualSection, contentStyle]}>
          {children}
        </Animated.View>
      </View>

      {/* Footer spacing */}
      <Animated.View style={[styles.footer, footerStyle]}>
        <Text style={styles.tapHint}>Tap anywhere to continue</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
  },
  gradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressContainer: {
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    zIndex: 10,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between' as const,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headlineSection: {
    alignItems: 'center' as const,
  },
  headline: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: colors.textOnAccent,
    textAlign: 'center' as const,
    letterSpacing: -0.5,
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subheadline: {
    fontSize: 17,
    color: colors.text,
    opacity: 0.7,
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  visualSection: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
    alignItems: 'center' as const,
  },
  tapHint: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.4,
  },
}));
