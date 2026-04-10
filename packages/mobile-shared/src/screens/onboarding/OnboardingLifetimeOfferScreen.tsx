import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingLifetimeOffer'>;

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
  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_LifetimeOffer');
    loadPackages();
    headerOpacity.value = withTiming(1, { duration: 400 });
    headerTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withDelay(250, withTiming(1, { duration: 400 }));
    cardScale.value = withDelay(250, withSpring(1, { damping: 12, stiffness: 100 }));
    footerOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
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

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const footerAnimatedStyle = useAnimatedStyle(() => ({ opacity: footerOpacity.value }));

  const priceString = lifetime?.product.priceString ?? '$14.99';

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar totalSteps={13} currentStep={12} style={{ paddingHorizontal: 20, paddingTop: 12 }} />

      <View style={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.headerSection, headerAnimatedStyle]}>
          <Text style={styles.waitText}>Wait — one-time offer</Text>
          <Image source={assets.aiAvatar} style={styles.avatar} />
          <Text style={styles.headline}>Lifetime Access</Text>
          <Text style={styles.subheadline}>
            {priceString} — never pay again
          </Text>
        </Animated.View>

        {/* Lifetime card */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : (
          <Animated.View style={[styles.lifetimeCard, cardAnimatedStyle]}>
            <View style={styles.lifetimeBadge}>
              <Ionicons name="infinity" size={20} color={colors.textOnAccent} />
            </View>
            <Text style={styles.cardTitle}>Lifetime {brand.appName}+</Text>
            <Text style={styles.cardPrice}>{priceString}</Text>
            <Text style={styles.cardSubtitle}>One-time purchase. No subscription.</Text>
            <View style={styles.cardBenefits}>
              <Text style={styles.cardBenefitItem}>Unlimited AI recommendations</Text>
              <Text style={styles.cardBenefitItem}>Ad-free experience forever</Text>
              <Text style={styles.cardBenefitItem}>2.5x rewards on every check-in</Text>
              <Text style={styles.cardBenefitItem}>All future premium features</Text>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, footerAnimatedStyle]}>
        <TouchableOpacity
          style={[styles.ctaButton, (purchasing || !lifetime) && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !lifetime}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.ctaText}>Get Lifetime Access — {priceString}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>No thanks, continue free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          disabled={restoring}
        >
          <Text style={styles.restoreText}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </TouchableOpacity>

        <View style={styles.legalRow}>
          <TouchableOpacity onPress={() => Linking.openURL(brand.termsUrl)}>
            <Text style={styles.legalLink}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.legalDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL(brand.privacyUrl)}>
            <Text style={styles.legalLink}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' as const },
  headerSection: { alignItems: 'center' as const, marginBottom: 28 },
  waitText: { fontSize: 14, fontWeight: '600' as const, color: colors.accent, letterSpacing: 0.5, textTransform: 'uppercase' as const, marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 16 },
  headline: { fontSize: 30, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const, marginBottom: 8 },
  subheadline: { fontSize: 18, color: colors.textMuted, textAlign: 'center' as const },
  lifetimeCard: { backgroundColor: colors.cardBg, borderRadius: radius.xl, padding: 28, alignItems: 'center' as const, borderWidth: 2, borderColor: colors.accent },
  lifetimeBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 14 },
  cardTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.text, marginBottom: 4 },
  cardPrice: { fontSize: 32, fontWeight: '800' as const, color: colors.accent, marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: colors.textMuted, marginBottom: 18 },
  cardBenefits: { gap: 8, width: '100%' as any },
  cardBenefitItem: { fontSize: 14, color: colors.text, paddingLeft: 8 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  ctaButton: { backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: 18, alignItems: 'center' as const, marginBottom: 10 },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 17, fontWeight: '700' as const, color: colors.textOnAccent },
  skipButton: { alignItems: 'center' as const, paddingVertical: 10, marginBottom: 6 },
  skipText: { fontSize: 15, color: colors.textMuted },
  restoreButton: { alignItems: 'center' as const, paddingVertical: 6, marginBottom: 8 },
  restoreText: { fontSize: 13, color: colors.textMuted },
  legalRow: { flexDirection: 'row' as const, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 8 },
  legalLink: { fontSize: 11, color: colors.textMuted, textDecorationLine: 'underline' as const },
  legalDivider: { fontSize: 11, color: colors.textMuted },
}));
