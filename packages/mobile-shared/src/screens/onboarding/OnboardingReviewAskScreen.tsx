import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  withSpring,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { setUserSentiment } from '../../lib/reviewPrompts';
import { getColors, getBrand, getAssets } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { trackScreenView, trackClick } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingReviewAsk'>;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function OnboardingReviewAskScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const assets = getAssets();
  const [selectedOption, setSelectedOption] = useState<'positive' | 'neutral' | null>(null);

  const avatarOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(0.7);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const card1Scale = useSharedValue(0.8);
  const card1Opacity = useSharedValue(0);
  const card2Scale = useSharedValue(0.8);
  const card2Opacity = useSharedValue(0);
  const skipOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_ReviewAsk');
  }, []);

  useEffect(() => {
    avatarOpacity.value = withDelay(100, withTiming(1, { duration: 500 }));
    avatarScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 80 }));
    titleOpacity.value = withDelay(250, withTiming(1, { duration: 400 }));
    titleTranslate.value = withDelay(250, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    card1Opacity.value = withDelay(450, withTiming(1, { duration: 400 }));
    card1Scale.value = withDelay(450, withSpring(1, { damping: 15, stiffness: 100 }));
    card2Opacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    card2Scale.value = withDelay(600, withSpring(1, { damping: 15, stiffness: 100 }));
    skipOpacity.value = withDelay(750, withTiming(1, { duration: 400 }));
  }, []);

  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [{ scale: avatarScale.value }],
  }));
  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const card1AnimatedStyle = useAnimatedStyle(() => ({ opacity: card1Opacity.value, transform: [{ scale: card1Scale.value }] }));
  const card2AnimatedStyle = useAnimatedStyle(() => ({ opacity: card2Opacity.value, transform: [{ scale: card2Scale.value }] }));
  const skipAnimatedStyle = useAnimatedStyle(() => ({ opacity: skipOpacity.value }));

  const handleSelect = async (sentiment: 'positive' | 'neutral') => {
    setSelectedOption(sentiment);
    await setUserSentiment(sentiment);
    // Skip paywall if DISABLE_PREMIUM flag is set
    const nextScreen = process.env.EXPO_PUBLIC_DISABLE_PREMIUM === 'true' ? 'OnboardingPremiumIntro' : 'OnboardingPaywall';
    setTimeout(() => { navigation.navigate(nextScreen as 'OnboardingPaywall'); }, 400);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.accent, `${colors.accent}DD`, colors.accent]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      <View style={styles.progressWrap}>
        <OnboardingProgressBar totalSteps={12} currentStep={9} style={{ paddingHorizontal: 20 }} />
      </View>

      <View style={styles.content}>
        {/* Rosie avatar */}
        <Animated.View style={[styles.avatarContainer, avatarStyle]}>
          <Image source={assets.aiAvatar} style={styles.avatar} />
        </Animated.View>

        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>Loving what you see?</Text>
          <Text style={styles.subheadline}>Your feedback helps us make{'\n'}{brand.cityName} even better</Text>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <AnimatedTouchable
            style={[styles.card, card1AnimatedStyle, selectedOption === 'positive' && styles.cardSelected]}
            onPress={() => handleSelect('positive')}
            activeOpacity={0.8}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconCircle, selectedOption === 'positive' && styles.iconCircleSelected]}>
                <Text style={styles.emoji}>❤️</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Yes, I'm excited!</Text>
                <Text style={styles.cardDescription}>{`Can't wait to explore ${brand.cityName}`}</Text>
              </View>
            </View>
            {selectedOption === 'positive' && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={18} color={colors.textOnAccent} />
              </View>
            )}
          </AnimatedTouchable>

          <AnimatedTouchable
            style={[styles.card, card2AnimatedStyle, selectedOption === 'neutral' && styles.cardSelected]}
            onPress={() => handleSelect('neutral')}
            activeOpacity={0.8}
          >
            <View style={styles.cardInner}>
              <View style={[styles.iconCircle, selectedOption === 'neutral' && styles.iconCircleSelected]}>
                <Text style={styles.emoji}>🤔</Text>
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Not sure yet</Text>
                <Text style={styles.cardDescription}>I'll explore first</Text>
              </View>
            </View>
            {selectedOption === 'neutral' && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={18} color={colors.textOnAccent} />
              </View>
            )}
          </AnimatedTouchable>
        </View>

        <Animated.View style={[styles.skipContainer, skipAnimatedStyle]}>
          <TouchableOpacity onPress={() => {
            trackClick('onboarding_skip', undefined);
            const nextScreen = process.env.EXPO_PUBLIC_DISABLE_PREMIUM === 'true' ? 'OnboardingPremiumIntro' : 'OnboardingPaywall';
            navigation.navigate(nextScreen as 'OnboardingPaywall');
          }}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  gradient: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  progressWrap: { paddingTop: Platform.OS === 'ios' ? 54 : 24 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' as const },
  avatarContainer: { alignItems: 'center' as const, marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  headerSection: { marginBottom: 36, alignItems: 'center' as const },
  headline: { fontSize: 28, fontWeight: '800' as const, color: colors.textOnAccent, marginBottom: 10, textAlign: 'center' as const },
  subheadline: { fontSize: 16, color: colors.textOnAccent, opacity: 0.85, textAlign: 'center' as const, lineHeight: 24 },
  cardsContainer: { gap: 14 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.accent,
    position: 'relative' as const,
  },
  cardSelected: { borderColor: colors.accent, backgroundColor: `${colors.accent}15` },
  cardInner: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 16 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center' as const, alignItems: 'center' as const },
  iconCircleSelected: { backgroundColor: `${colors.accent}30` },
  emoji: { fontSize: 28 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '700' as const, color: colors.textOnAccent, marginBottom: 4 },
  cardDescription: { fontSize: 14, color: colors.textOnAccent, opacity: 0.7 },
  checkmark: { position: 'absolute' as const, top: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.valueGreen, justifyContent: 'center' as const, alignItems: 'center' as const },
  skipContainer: { marginTop: 32, alignItems: 'center' as const },
  skipText: { fontSize: 15, color: colors.textOnAccent, opacity: 0.6, padding: 12 },
}));
