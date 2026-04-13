import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { PurchasesPackage } from 'react-native-purchases';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useNavigationActions } from '../../context/NavigationActionsContext';
import { getColors, getBrand, getAssets } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import {
  getAvailablePackages,
  purchaseSubscription,
  restorePurchases,
} from '../../lib/subscription';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { trackScreenView, trackClick } from '../../lib/analytics';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingLifetimeOffer'>;

const { width: SW, height: SH } = Dimensions.get('window');

// Celebration particles
const PARTICLES = [
  { x: SW * 0.08, y: SH * 0.10, size: 6, color: '#FFD700', delay: 0 },
  { x: SW * 0.88, y: SH * 0.08, size: 8, color: '#FF6B6B', delay: 100 },
  { x: SW * 0.20, y: SH * 0.22, size: 5, color: '#4ECDC4', delay: 200 },
  { x: SW * 0.82, y: SH * 0.25, size: 7, color: '#FFD700', delay: 150 },
  { x: SW * 0.05, y: SH * 0.40, size: 4, color: '#FF6B6B', delay: 300 },
  { x: SW * 0.93, y: SH * 0.42, size: 6, color: '#4ECDC4', delay: 250 },
];

function Particle({ x, y, size, color, delay }: typeof PARTICLES[0]) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const floatY = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay + 300, withTiming(0.5, { duration: 500 }));
    scale.value = withDelay(delay + 300, withSpring(1, { damping: 8, stiffness: 120 }));
    floatY.value = withDelay(delay + 300, withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 2000 + Math.random() * 1000, easing: Easing.inOut(Easing.sin) })
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

const BENEFITS = [
  'Ad-free experience',
  'Exclusive daily deals & specials',
  '2.5x rewards on every check-in',
  'Priority event notifications',
  'Unlimited AI-powered itineraries',
  'Premium restaurant insights',
  'Early access to new features',
];

export default function OnboardingLifetimeOfferScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const assets = getAssets();
  const { completeOnboarding } = useOnboarding();
  const { finishOnboarding } = useNavigationActions();

  const [lifetime, setLifetime] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Animations
  const badgeOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.6);
  const avatarOpacity = useSharedValue(0);
  const avatarScale = useSharedValue(0.7);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslate = useSharedValue(20);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const ctaOpacity = useSharedValue(0);
  const ctaTranslate = useSharedValue(20);

  useEffect(() => {
    trackScreenView('OnboardingStep_LifetimeOffer');
    loadPackages();

    if (Haptics) {
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }, 200);
    }

    badgeOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    badgeScale.value = withDelay(100, withSpring(1, { damping: 10, stiffness: 120 }));
    avatarOpacity.value = withDelay(250, withTiming(1, { duration: 400 }));
    avatarScale.value = withDelay(250, withSpring(1, { damping: 12, stiffness: 80 }));
    headlineOpacity.value = withDelay(400, withTiming(1, { duration: 500 }));
    headlineTranslate.value = withDelay(400, withSpring(0, { damping: 16, stiffness: 80 }));
    cardOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    cardScale.value = withDelay(600, withSpring(1, { damping: 14, stiffness: 80 }));
    ctaOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    ctaTranslate.value = withDelay(800, withSpring(0, { damping: 16, stiffness: 80 }));
  }, []);

  const loadPackages = async () => {
    try {
      const packages = await getAvailablePackages();
      setLifetime(packages.lifetime);
    } catch (error) {
      console.error('[LifetimeOffer] Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = useCallback(async () => {
    if (!lifetime || purchasing) return;
    setPurchasing(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    trackClick('onboarding_lifetime_purchase');

    try {
      const result = await purchaseSubscription(lifetime);
      if (result.success) {
        await completeOnboarding();
        finishOnboarding();
      } else if (result.error && result.error !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', result.error);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setPurchasing(false);
    }
  }, [lifetime, purchasing, completeOnboarding, finishOnboarding]);

  const handleRestore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    trackClick('onboarding_lifetime_restore');

    try {
      const result = await restorePurchases();
      if (result.isPremium) {
        await completeOnboarding();
        finishOnboarding();
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases for this account.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Something went wrong');
    } finally {
      setRestoring(false);
    }
  }, [restoring, completeOnboarding, finishOnboarding]);

  const handleSkip = async () => {
    trackClick('onboarding_lifetime_skip');
    navigation.navigate('OnboardingPremiumIntro');
  };

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));
  const avatarStyle = useAnimatedStyle(() => ({
    opacity: avatarOpacity.value,
    transform: [{ scale: avatarScale.value }],
  }));
  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslate.value }],
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaTranslate.value }],
  }));

  const priceString = lifetime?.product.priceString ?? '$14.99';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.accent, `${colors.accent}DD`, colors.accent]}
        locations={[0, 0.5, 1]}
        style={styles.gradient}
      />

      {/* Celebration particles */}
      {PARTICLES.map((p, i) => (
        <Particle key={i} {...p} />
      ))}

      <View style={styles.progressWrap}>
        <OnboardingProgressBar totalSteps={12} currentStep={10} style={{ paddingHorizontal: 20 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Badge */}
        <Animated.View style={[styles.badgeContainer, badgeStyle]}>
          <View style={styles.badge}>
            <Ionicons name="flash" size={14} color="#FFFFFF" />
            <Text style={styles.badgeText}>Limited Offer</Text>
          </View>
        </Animated.View>

        {/* Avatar */}
        <Animated.View style={[styles.avatarContainer, avatarStyle]}>
          <Image source={assets.aiAvatar} style={styles.avatar} />
        </Animated.View>

        {/* Headline */}
        <Animated.View style={[styles.headerSection, headlineStyle]}>
          <Text style={styles.headline}>40% Off Your First Year</Text>
          <Text style={styles.subheadline}>{priceString}/year — just this once</Text>
        </Animated.View>

        {/* Benefits card */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : (
          <Animated.View style={[styles.card, cardStyle]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{brand.appName}+</Text>
              <Text style={styles.cardPrice}>{priceString}<Text style={styles.cardPricePeriod}>/yr</Text></Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBenefits}>
              {BENEFITS.map((benefit, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#C9A227" />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.cardRenewal}>Renews at $24.99/yr — cancel anytime</Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Fixed footer */}
      <Animated.View style={[styles.footer, ctaStyle]}>
        <TouchableOpacity
          style={[styles.ctaButton, purchasing && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
          activeOpacity={0.9}
        >
          {purchasing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.ctaText}>Get 40% Off — {priceString}/year</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.footerLink}>No thanks</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={styles.footerLink}>{restoring ? 'Restoring...' : 'Restore'}</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(brand.termsUrl)}>
            <Text style={styles.footerLink}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.footerDot}>·</Text>
          <TouchableOpacity onPress={() => Linking.openURL(brand.privacyUrl)}>
            <Text style={styles.footerLink}>Privacy</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  gradient: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  progressWrap: { paddingTop: Platform.OS === 'ios' ? 54 : 24 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },

  // Badge
  badgeContainer: { alignItems: 'center' as const, marginBottom: 16 },
  badge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    backgroundColor: '#C9A227',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },

  // Avatar
  avatarContainer: { alignItems: 'center' as const, marginBottom: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)' },

  // Header
  headerSection: { alignItems: 'center' as const, marginBottom: 24 },
  headline: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.textOnAccent,
    textAlign: 'center' as const,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 16,
    color: colors.textOnAccent,
    opacity: 0.7,
    textAlign: 'center' as const,
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(201,162,39,0.4)',
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'baseline' as const,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  cardPrice: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#C9A227',
  },
  cardPricePeriod: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.4)',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  cardBenefits: { gap: 12 },
  benefitRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  benefitText: { fontSize: 14, color: colors.textOnAccent, opacity: 0.85, flex: 1 },
  cardRenewal: {
    fontSize: 12,
    color: colors.textOnAccent,
    opacity: 0.5,
    textAlign: 'center' as const,
    marginTop: 16,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 12,
  },
  ctaButton: {
    backgroundColor: '#C9A227',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center' as const,
    marginBottom: 12,
    shadowColor: '#C9A227',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 17, fontWeight: '700' as const, color: '#000' },
  footerLinks: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  footerLink: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500' as const,
  },
  footerDot: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
  },
}));
