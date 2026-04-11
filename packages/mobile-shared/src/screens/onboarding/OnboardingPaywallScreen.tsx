import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPaywall'>;

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
  const headlineAnim = useSharedValue(0);
  const timelineAnim = useSharedValue(0);
  const pricingAnim = useSharedValue(0);
  const ctaAnim = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_Paywall');
    loadPackages();
    headlineAnim.value = withDelay(100, withSpring(1, { damping: 14, stiffness: 60 }));
    timelineAnim.value = withDelay(250, withSpring(1, { damping: 16, stiffness: 70 }));
    pricingAnim.value = withDelay(400, withSpring(1, { damping: 16, stiffness: 70 }));
    ctaAnim.value = withDelay(550, withSpring(1, { damping: 14, stiffness: 60 }));
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

  const handlePlanSelect = (plan: 'monthly' | 'annual') => {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedPlan(plan);
  };

  const handlePurchase = useCallback(async () => {
    const pkg = selectedPlan === 'annual' ? annual : monthly;
    if (!pkg || purchasing) return;

    setPurchasing(true);
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    trackClick(`onboarding_paywall_purchase_${selectedPlan}`);

    try {
      const result = await purchaseSubscription(pkg);
      if (result.success) {
        if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const result = await restorePurchases();
      if (result.isPremium) {
        await completeOnboarding();
        finishOnboarding();
      } else {
        Alert.alert('No Purchases Found', 'No active subscription to restore.');
      }
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Something went wrong');
    } finally {
      setRestoring(false);
    }
  }, [restoring, completeOnboarding, finishOnboarding]);

  const handleSkip = () => {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    trackClick('onboarding_paywall_skip');
    navigation.navigate('OnboardingLifetimeOffer');
  };

  const headlineStyle = useAnimatedStyle(() => ({
    opacity: headlineAnim.value,
    transform: [{ translateY: (1 - headlineAnim.value) * 20 }],
  }));
  const timelineStyle = useAnimatedStyle(() => ({
    opacity: timelineAnim.value,
    transform: [{ scale: 0.95 + timelineAnim.value * 0.05 }],
  }));
  const pricingStyle = useAnimatedStyle(() => ({
    opacity: pricingAnim.value,
    transform: [{ translateY: (1 - pricingAnim.value) * 20 }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaAnim.value,
    transform: [{ translateY: (1 - ctaAnim.value) * 20 }],
  }));

  const monthlyPrice = monthly?.product.priceString ?? '$4.99';
  const annualPrice = annual?.product.priceString ?? '$24.99';
  const annualRaw = annual?.product.price ?? 24.99;
  const perMonth = `$${(annualRaw / 12).toFixed(2)}`;

  // Dynamic billing text based on selected plan
  const billingText = selectedPlan === 'annual'
    ? `Billing starts. ${annualPrice} per year`
    : `Billing starts. ${monthlyPrice} per month`;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[`${colors.accent}15`, colors.primary, colors.primary]}
        style={styles.gradient}
      />
      <View style={styles.progressWrap}>
        <OnboardingProgressBar totalSteps={12} currentStep={10} style={{ paddingHorizontal: 20 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Branding + Headline */}
        <Animated.View style={[styles.headerSection, headlineStyle]}>
          <Image source={assets.aiAvatar} style={styles.avatar} />
          <Text style={styles.brandName}>{brand.appName}+</Text>
          <Text style={styles.headline}>
            {selectedPlan === 'annual' ? `Start your 3-day\nfree trial` : `Unlock everything`}
          </Text>
        </Animated.View>

        {/* Trial Timeline */}
        <Animated.View style={[styles.timelineCard, timelineStyle]}>
          {/* Today */}
          <View style={styles.timelineRow}>
            <View style={styles.dotColumn}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View style={[styles.dotLine, { backgroundColor: `${colors.accent}30` }]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.dayLabel}>Today</Text>
              <Text style={styles.dayText}>
                Ad-free browsing, exclusive deals, 2.5x rewards, priority event access, and more
              </Text>
            </View>
          </View>
          {/* Day 2 */}
          <View style={styles.timelineRow}>
            <View style={styles.dotColumn}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <View style={[styles.dotLine, { backgroundColor: `${colors.accent}30` }]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.dayLabel}>Day 2</Text>
              <Text style={styles.dayText}>We'll remind you before your trial ends</Text>
            </View>
          </View>
          {/* Day 3 */}
          <View style={styles.timelineRow}>
            <View style={styles.dotColumn}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.dayLabel}>Day 3</Text>
              <Text style={styles.dayText}>{billingText}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Pricing Cards — Side by Side */}
        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginVertical: 24 }} />
        ) : (
          <Animated.View style={[styles.pricingRow, pricingStyle]}>
            {/* Monthly */}
            <TouchableOpacity
              style={[styles.priceCard, selectedPlan === 'monthly' && styles.priceCardSelected]}
              onPress={() => handlePlanSelect('monthly')}
              activeOpacity={0.8}
            >
              <Text style={styles.planName}>Monthly</Text>
              <Text style={styles.planPrice}>{monthlyPrice.replace('/month', '').replace('/mo', '')}</Text>
              <Text style={styles.planPeriod}>per month</Text>
              {selectedPlan === 'monthly' && (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            {/* Annual */}
            <TouchableOpacity
              style={[styles.priceCard, selectedPlan === 'annual' && styles.priceCardSelected]}
              onPress={() => handlePlanSelect('annual')}
              activeOpacity={0.8}
            >
              {selectedPlan === 'annual' && (
                <View style={[styles.trialBadge, { backgroundColor: colors.accent }]}>
                  <Text style={styles.trialBadgeText}>3 days free</Text>
                </View>
              )}
              <Text style={[styles.planName, { marginTop: 18 }]}>Yearly</Text>
              <Text style={styles.planPrice}>{annualPrice.replace('/year', '').replace('/yr', '')}</Text>
              <Text style={styles.planPeriod}>per year</Text>
              <Text style={styles.planBreakdown}>{perMonth}/mo</Text>
              {selectedPlan === 'annual' && (
                <View style={[styles.checkBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* No payment now */}
        <Animated.View style={[styles.reassurance, ctaStyle]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
          <Text style={styles.reassuranceText}>No payment due now</Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={ctaStyle}>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.accent }, (purchasing || (!monthly && !annual)) && styles.ctaDisabled]}
            onPress={handlePurchase}
            disabled={purchasing || (!monthly && !annual)}
            activeOpacity={0.9}
          >
            {purchasing ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.ctaText}>
                {selectedPlan === 'annual' ? 'Start my 3-day free trial' : `Subscribe — ${monthlyPrice}/month`}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.belowCta}>
            {selectedPlan === 'annual'
              ? `3 days free, then ${annualPrice} per year (${perMonth}/mo)`
              : `${monthlyPrice} per month. Cancel anytime.`}
          </Text>
        </Animated.View>

        {/* Footer — minimal */}
        <Animated.View style={[styles.footer, ctaStyle]}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.footerLink}>Skip</Text>
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
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  gradient: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  progressWrap: { paddingTop: Platform.OS === 'ios' ? 54 : 24 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
    justifyContent: 'flex-end' as const,
  },
  headerSection: { alignItems: 'center' as const, marginBottom: 24 },
  avatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 12 },
  brandName: { fontSize: 16, fontWeight: '700' as const, color: colors.accent, letterSpacing: 0.5, marginBottom: 8 },
  headline: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    lineHeight: 40,
  },
  // Timeline
  timelineCard: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  timelineRow: { flexDirection: 'row' as const, marginBottom: 4 },
  dotColumn: { width: 28, alignItems: 'center' as const, paddingTop: 5 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotLine: { width: 2, flex: 1, marginVertical: 4 },
  timelineContent: { flex: 1, marginLeft: 16, paddingBottom: 18 },
  dayLabel: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  dayText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
  },
  // Pricing
  pricingRow: {
    flexDirection: 'row' as const,
    gap: 12,
    marginBottom: 16,
  },
  priceCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center' as const,
    overflow: 'visible' as const,
    position: 'relative' as const,
  },
  priceCardSelected: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}10`,
  },
  trialBadge: {
    position: 'absolute' as const,
    top: -12,
    alignSelf: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
  },
  trialBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#000',
  },
  planName: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  planBreakdown: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  checkBadge: {
    position: 'absolute' as const,
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Reassurance
  reassurance: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginBottom: 16,
  },
  reassuranceText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.7)',
  },
  // CTA
  ctaButton: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: '#000',
  },
  belowCta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center' as const,
    marginTop: 10,
  },
  // Footer
  footer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingTop: 12,
  },
  footerLink: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  footerDot: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
  },
}));
