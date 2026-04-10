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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPaywall'>;

const PREMIUM_BENEFITS = [
  { icon: 'chatbubble-ellipses' as const, text: 'Unlimited AI recommendations' },
  { icon: 'pricetag' as const, text: 'Exclusive deals & early event access' },
  { icon: 'remove-circle' as const, text: 'Ad-free experience' },
  { icon: 'star' as const, text: '2.5x rewards on every check-in' },
];

export default function OnboardingPaywallScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const assets = getAssets();
  const { completeOnboarding } = useOnboarding();
  const { finishOnboarding } = useNavigationActions();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [monthly, setMonthly] = useState<PurchasesPackage | null>(null);
  const [annual, setAnnual] = useState<PurchasesPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Animations
  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);
  const contentOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_Paywall');
    loadPackages();
    headerOpacity.value = withTiming(1, { duration: 400 });
    headerTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    contentOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    footerOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
  }, []);

  const loadPackages = async () => {
    try {
      const packages = await getAvailablePackages();
      setMonthly(packages.monthly);
      setAnnual(packages.annual);
    } catch (error) {
      console.error('[OnboardingPaywall] Failed to load packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = useCallback(async () => {
    const pkg = selectedPlan === 'annual' ? annual : monthly;
    if (!pkg || purchasing) return;

    setPurchasing(true);
    trackClick('onboarding_paywall_purchase', undefined, { plan: selectedPlan });

    try {
      const result = await purchaseSubscription(pkg);
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
  }, [selectedPlan, annual, monthly, purchasing, completeOnboarding, finishOnboarding]);

  const handleRestore = useCallback(async () => {
    if (restoring) return;
    setRestoring(true);
    trackClick('onboarding_paywall_restore');

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

  const handleSkip = () => {
    trackClick('onboarding_paywall_skip');
    navigation.navigate('OnboardingLifetimeOffer');
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const footerAnimatedStyle = useAnimatedStyle(() => ({ opacity: footerOpacity.value }));

  const selectedPkg = selectedPlan === 'annual' ? annual : monthly;
  const ctaText = selectedPlan === 'annual'
    ? `Start Free Trial — ${annual?.product.priceString ?? '$24.99'}/year`
    : `Subscribe — ${monthly?.product.priceString ?? '$4.99'}/month`;

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar totalSteps={13} currentStep={12} style={{ paddingHorizontal: 20, paddingTop: 12 }} />

      <View style={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.headerSection, headerAnimatedStyle]}>
          <Image source={assets.aiAvatar} style={styles.avatar} />
          <Text style={styles.headline}>Unlock {brand.appName}+</Text>
          <Text style={styles.subheadline}>
            Let {brand.aiName} do the thinking for you
          </Text>
        </Animated.View>

        {/* Benefits */}
        <Animated.View style={[styles.benefitsSection, contentAnimatedStyle]}>
          {PREMIUM_BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={18} color={colors.accent} />
              </View>
              <Text style={styles.benefitText}>{benefit.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Plan selector */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : (
          <Animated.View style={[styles.plansSection, contentAnimatedStyle]}>
            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.8}
            >
              <View style={styles.planRadio}>
                {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>Monthly</Text>
                <Text style={styles.planPrice}>
                  {monthly?.product.priceString ?? '$4.99'}/month
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.8}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <View style={styles.planRadio}>
                {selectedPlan === 'annual' && <View style={styles.planRadioInner} />}
              </View>
              <View style={styles.planInfo}>
                <Text style={styles.planTitle}>Annual</Text>
                <Text style={styles.planPrice}>
                  3 days FREE, then {annual?.product.priceString ?? '$24.99'}/year
                </Text>
                <Text style={styles.planSavings}>Save 58%</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, footerAnimatedStyle]}>
        <TouchableOpacity
          style={[styles.ctaButton, (purchasing || !selectedPkg) && styles.ctaButtonDisabled]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPkg}
          activeOpacity={0.8}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.textOnAccent} />
          ) : (
            <Text style={styles.ctaText}>{ctaText}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
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

        <Text style={styles.legalText}>
          {selectedPlan === 'annual'
            ? 'Free trial for 3 days. After trial, payment is charged to your Apple ID account. '
            : 'Payment is charged to your Apple ID account at confirmation. '}
          Subscription auto-renews unless canceled at least 24 hours before the end of the current period.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' as const },
  headerSection: { alignItems: 'center' as const, marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 14 },
  headline: { fontSize: 26, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const, marginBottom: 6 },
  subheadline: { fontSize: 15, color: colors.textMuted, textAlign: 'center' as const },
  benefitsSection: { marginBottom: 24, gap: 12 },
  benefitRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12 },
  benefitIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${colors.accent}20`, justifyContent: 'center' as const, alignItems: 'center' as const },
  benefitText: { fontSize: 15, color: colors.text, flex: 1 },
  plansSection: { gap: 10 },
  planCard: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: 16, borderWidth: 2, borderColor: 'transparent', position: 'relative' as const },
  planCardSelected: { borderColor: colors.accent, backgroundColor: colors.cardBgSelected },
  planRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.textMuted, justifyContent: 'center' as const, alignItems: 'center' as const, marginRight: 12 },
  planRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  planInfo: { flex: 1 },
  planTitle: { fontSize: 16, fontWeight: '600' as const, color: colors.text, marginBottom: 2 },
  planPrice: { fontSize: 13, color: colors.textMuted },
  planSavings: { fontSize: 12, fontWeight: '600' as const, color: colors.success, marginTop: 2 },
  bestValueBadge: { position: 'absolute' as const, top: -9, right: 14, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  bestValueText: { fontSize: 10, fontWeight: '700' as const, color: colors.textOnAccent, letterSpacing: 0.5 },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  ctaButton: { backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: 16, alignItems: 'center' as const, marginBottom: 8 },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 16, fontWeight: '700' as const, color: colors.textOnAccent },
  skipButton: { alignItems: 'center' as const, paddingVertical: 8, marginBottom: 4 },
  skipText: { fontSize: 15, color: colors.textMuted },
  restoreButton: { alignItems: 'center' as const, paddingVertical: 6, marginBottom: 6 },
  restoreText: { fontSize: 13, color: colors.textMuted },
  legalRow: { flexDirection: 'row' as const, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 8, marginBottom: 6 },
  legalLink: { fontSize: 11, color: colors.textMuted, textDecorationLine: 'underline' as const },
  legalDivider: { fontSize: 11, color: colors.textMuted },
  legalText: { fontSize: 10, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 14, paddingHorizontal: 4 },
}));
