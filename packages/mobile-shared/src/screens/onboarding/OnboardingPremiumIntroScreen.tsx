import { useEffect } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useNavigationActions } from '../../context/NavigationActionsContext';
import { getColors, getBrand, getAssets } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { trackScreenView } from '../../lib/analytics';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPremiumIntro'>;

const { width: SW, height: SH } = Dimensions.get('window');

// Celebration particles — scattered around the screen
const PARTICLES = [
  { x: SW * 0.12, y: SH * 0.15, size: 6, color: '#FFD700', delay: 0 },
  { x: SW * 0.85, y: SH * 0.12, size: 8, color: '#FF6B6B', delay: 100 },
  { x: SW * 0.25, y: SH * 0.28, size: 5, color: '#4ECDC4', delay: 200 },
  { x: SW * 0.78, y: SH * 0.32, size: 7, color: '#FFD700', delay: 150 },
  { x: SW * 0.08, y: SH * 0.45, size: 4, color: '#FF6B6B', delay: 300 },
  { x: SW * 0.92, y: SH * 0.48, size: 6, color: '#4ECDC4', delay: 250 },
  { x: SW * 0.35, y: SH * 0.08, size: 5, color: '#FFE66D', delay: 350 },
  { x: SW * 0.65, y: SH * 0.06, size: 7, color: '#FF6B6B', delay: 50 },
];

function CelebrationParticle({ x, y, size, color, delay }: typeof PARTICLES[0]) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay + 400, withTiming(0.6, { duration: 500 }));
    scale.value = withDelay(delay + 400, withSpring(1, { damping: 8, stiffness: 120 }));
    floatY.value = withDelay(delay + 400, withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: floatY.value }],
  }));

  return (
    <Animated.View style={[{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
    }, style]} />
  );
}

export default function OnboardingPremiumIntroScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const assets = getAssets();
  const { data, completeOnboarding } = useOnboarding();
  const { finishOnboarding } = useNavigationActions();
  const userName = data.name;

  const videoSource = assets.splashVideo ?? 0;
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Logo entrance — dramatic scale + glow
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.5);

  // Text stagger
  const headlineOpacity = useSharedValue(0);
  const headlineTranslate = useSharedValue(30);
  const subOpacity = useSharedValue(0);
  const subTranslate = useSharedValue(20);

  // CTA button
  const ctaOpacity = useSharedValue(0);
  const ctaTranslate = useSharedValue(20);


  useEffect(() => {
    trackScreenView('OnboardingStep_PremiumIntro');

    // Success haptic
    if (Haptics) {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }, 300);
    }

    // Logo scales in dramatically
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    logoScale.value = withDelay(100, withSpring(1, { damping: 10, stiffness: 70 }));

    // Headlines stagger
    headlineOpacity.value = withDelay(700, withTiming(1, { duration: 500 }));
    headlineTranslate.value = withDelay(700, withSpring(0, { damping: 16, stiffness: 80 }));

    subOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    subTranslate.value = withDelay(900, withSpring(0, { damping: 18, stiffness: 90 }));

    // CTA
    ctaOpacity.value = withDelay(1100, withTiming(1, { duration: 400 }));
    ctaTranslate.value = withDelay(1100, withSpring(0, { damping: 16, stiffness: 80 }));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslate.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({
    opacity: subOpacity.value,
    transform: [{ translateY: subTranslate.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslate.value }],
  }));

  const handleContinue = async () => {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    await completeOnboarding();
    finishOnboarding();
  };

  return (
    <View style={styles.container}>
      {/* Subtle celebration particles */}
      {PARTICLES.map((p, i) => (
        <CelebrationParticle key={i} {...p} />
      ))}

      <View style={styles.progressWrap}>
        <OnboardingProgressBar totalSteps={12} currentStep={12} style={{ paddingHorizontal: 20 }} />
      </View>

      <View style={styles.content}>
        {/* Animated logo */}
        <Animated.View style={[styles.videoContainer, logoStyle]}>
          <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
        </Animated.View>

        {/* Headlines */}
        <Animated.View style={[styles.headerSection, headlineStyle]}>
          <Text style={styles.headline}>{userName ? `You're all set, ${userName}` : `You're all set`}</Text>
        </Animated.View>

        <Animated.Text style={[styles.subheadline, subStyle]}>
          {`${brand.cityName} is waiting for you\nLet's find something good`}
        </Animated.Text>
      </View>

      {/* CTA */}
      <Animated.View style={[styles.footer, ctaStyle]}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.accent }]}
          onPress={handleContinue}
          activeOpacity={0.9}
        >
          <Text style={styles.ctaText}>Let's Go</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textOnAccent} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  progressWrap: { paddingTop: Platform.OS === 'ios' ? 54 : 24 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  videoContainer: {
    width: 200,
    height: 200,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 24,
  },
  video: { width: '100%', height: '100%', backgroundColor: 'transparent' },

  // Text
  headerSection: { alignItems: 'center' as const, marginBottom: 10 },
  headline: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: colors.text,
    textAlign: 'center' as const,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 17,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 26,
  },

  // CTA
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 50 : 32,
  },
  ctaButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radius.full,
    paddingVertical: 18,
    gap: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: colors.textOnAccent,
  },
}));
