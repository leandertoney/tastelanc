import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { getColors, getAssets, hasFeature } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { trackScreenView } from '../../lib/analytics';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingProblems'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.48;

export default function OnboardingProblemsScreen({ navigation }: Props) {
  const styles = useStyles();
  const assets = getAssets();
  const colors = getColors();

  // Image
  const imageOpacity = useSharedValue(0);
  const imageScale = useSharedValue(1.1);

  // "THIS" slam animation
  const thisOpacity = useSharedValue(0);
  const thisScale = useSharedValue(2.5);
  const thisRotate = useSharedValue(-5);

  // "is how you go out." gentle fade
  const restOpacity = useSharedValue(0);
  const restTranslate = useSharedValue(15);

  // Pain points — each from a different direction
  const line1Opacity = useSharedValue(0);
  const line1TranslateX = useSharedValue(-SCREEN_WIDTH);
  const line2Opacity = useSharedValue(0);
  const line2TranslateX = useSharedValue(SCREEN_WIDTH);
  const line3Opacity = useSharedValue(0);
  const line3TranslateX = useSharedValue(-SCREEN_WIDTH);

  // Ready? + tap hint
  const readyOpacity = useSharedValue(0);
  const readyScale = useSharedValue(0.8);
  const hintOpacity = useSharedValue(0);

  // Debounce state to prevent rapid taps
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => { trackScreenView('OnboardingStep_Interests'); }, []);

  useEffect(() => {
    // 1. Hero image fades in with subtle zoom
    imageOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.cubic) });
    imageScale.value = withTiming(1, { duration: 4000, easing: Easing.out(Easing.cubic) });

    // 2. "THIS" slams in from big → normal (400ms in)
    thisOpacity.value = withDelay(400, withTiming(1, { duration: 200 }));
    thisScale.value = withDelay(400, withSpring(1, { damping: 10, stiffness: 200 }));
    thisRotate.value = withDelay(400, withSpring(0, { damping: 12, stiffness: 150 }));

    // Haptic impact when THIS lands
    if (Haptics) {
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      }, 500);
    }

    // 3. "is how you go out." fades in gently (700ms)
    restOpacity.value = withDelay(700, withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) }));
    restTranslate.value = withDelay(700, withSpring(0, { damping: 20, stiffness: 100 }));

    // 4. Pain points slide in from alternating sides
    const lineBaseDelay = 1400;
    const lineStagger = 400;

    line1Opacity.value = withDelay(lineBaseDelay, withTiming(1, { duration: 300 }));
    line1TranslateX.value = withDelay(lineBaseDelay, withSpring(0, { damping: 18, stiffness: 100 }));

    line2Opacity.value = withDelay(lineBaseDelay + lineStagger, withTiming(1, { duration: 300 }));
    line2TranslateX.value = withDelay(lineBaseDelay + lineStagger, withSpring(0, { damping: 18, stiffness: 100 }));

    line3Opacity.value = withDelay(lineBaseDelay + lineStagger * 2, withTiming(1, { duration: 300 }));
    line3TranslateX.value = withDelay(lineBaseDelay + lineStagger * 2, withSpring(0, { damping: 18, stiffness: 100 }));

    // Light haptic for each line
    if (Haptics) {
      [lineBaseDelay, lineBaseDelay + lineStagger, lineBaseDelay + lineStagger * 2].forEach(d => {
        setTimeout(() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }, d);
      });
    }

    // 5. "Ready?" pops in
    const readyDelay = lineBaseDelay + lineStagger * 3 + 200;
    readyOpacity.value = withDelay(readyDelay, withTiming(1, { duration: 300 }));
    readyScale.value = withDelay(readyDelay, withSequence(
      withSpring(1.15, { damping: 8, stiffness: 200 }),
      withSpring(1, { damping: 15, stiffness: 100 })
    ));

    hintOpacity.value = withDelay(readyDelay + 500, withTiming(1, { duration: 400 }));
  }, []);

  const imageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ scale: imageScale.value }],
  }));
  const thisStyle = useAnimatedStyle(() => ({
    opacity: thisOpacity.value,
    transform: [{ scale: thisScale.value }, { rotate: `${thisRotate.value}deg` }],
  }));
  const restStyle = useAnimatedStyle(() => ({
    opacity: restOpacity.value,
    transform: [{ translateY: restTranslate.value }],
  }));
  const line1Style = useAnimatedStyle(() => ({
    opacity: line1Opacity.value,
    transform: [{ translateX: line1TranslateX.value }],
  }));
  const line2Style = useAnimatedStyle(() => ({
    opacity: line2Opacity.value,
    transform: [{ translateX: line2TranslateX.value }],
  }));
  const line3Style = useAnimatedStyle(() => ({
    opacity: line3Opacity.value,
    transform: [{ translateX: line3TranslateX.value }],
  }));
  const readyStyle = useAnimatedStyle(() => ({
    opacity: readyOpacity.value,
    transform: [{ scale: readyScale.value }],
  }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: hintOpacity.value }));

  const handlePress = useCallback(() => {
    if (isPressed) return; // Prevent double-tap

    setIsPressed(true);
    if (Haptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    navigation.navigate(hasFeature('happyHours') ? 'OnboardingHappyHours' : 'OnboardingEvents');

    // Re-enable after 1 second (in case navigation fails)
    setTimeout(() => setIsPressed(false), 1000);
  }, [isPressed, navigation]);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={handlePress}>
      <OnboardingProgressBar totalSteps={12} currentStep={0} style={styles.progressBar} />

      {/* Hero image with ken burns zoom */}
      <Animated.View style={[styles.heroSection, imageStyle]}>
        {assets.onboardingHero && (
          <Image source={assets.onboardingHero} style={styles.heroImage} resizeMode="cover" />
        )}
        <LinearGradient
          colors={['transparent', `${colors.primary}30`, colors.primary]}
          locations={[0.25, 0.65, 1]}
          style={styles.heroGradient}
        />
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        {/* Headline: "THIS is how you go out." */}
        <View style={styles.headlineRow}>
          <Animated.Text style={[styles.thisText, thisStyle]}>THIS</Animated.Text>
          <Animated.Text style={[styles.restText, restStyle]}> is how you go out!</Animated.Text>
        </View>

        {/* Pain points from alternating directions */}
        <View style={styles.linesSection}>
          <Animated.View style={[styles.lineContainer, line1Style]}>
            <View style={[styles.lineAccent, { backgroundColor: colors.accent }]} />
            <Text style={styles.lineText}>
              Happy hours <Text style={[styles.lineEmphasis, { color: colors.valueGreen }]}>worth</Text> showing up for
            </Text>
          </Animated.View>

          <Animated.View style={[styles.lineContainer, styles.lineRight, line2Style]}>
            <Text style={styles.lineText}>
              Events you'll <Text style={[styles.lineEmphasis, { color: colors.valueGreen }]}>actually</Text> want to go to
            </Text>
            <View style={[styles.lineAccent, { backgroundColor: colors.accent }]} />
          </Animated.View>

          <Animated.View style={[styles.lineContainer, line3Style]}>
            <View style={[styles.lineAccent, { backgroundColor: colors.accent }]} />
            <Text style={styles.lineText}>
              Deals you <Text style={[styles.lineEmphasis, { color: colors.valueGreen }]}>won't find</Text> anywhere else
            </Text>
          </Animated.View>
        </View>

        {/* Ready? */}
        <Animated.Text style={[styles.readyText, readyStyle]}>Ready?</Animated.Text>
      </View>

      {/* Tap hint */}
      <Animated.View style={[styles.footer, hintStyle]}>
        <Text style={styles.tapHint}>Tap anywhere to continue</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  progressBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  heroSection: {
    height: HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden' as const,
  },
  heroImage: {
    width: '100%',
    height: '130%',
    top: '-10%',
  },
  heroGradient: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  headlineRow: {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    flexWrap: 'wrap' as const,
    marginBottom: 28,
  },
  thisText: {
    fontSize: 38,
    fontWeight: '900' as const,
    color: '#FFFFFF',
    letterSpacing: 3,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  restText: {
    fontSize: 24,
    fontWeight: '300' as const,
    color: colors.textMuted,
  },
  linesSection: {
    gap: 18,
  },
  lineContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  lineRight: {
    justifyContent: 'flex-end' as const,
  },
  lineAccent: {
    width: 3,
    height: 24,
    borderRadius: 2,
  },
  lineText: {
    fontSize: 18,
    fontWeight: '400' as const,
    color: colors.textMuted,
    opacity: 0.9,
    lineHeight: 26,
  },
  lineEmphasis: {
    fontWeight: '700' as const,
  },
  readyText: {
    marginTop: 32,
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 44,
    alignItems: 'center' as const,
  },
  tapHint: {
    fontSize: 14,
    color: colors.textSecondary,
  },
}));
