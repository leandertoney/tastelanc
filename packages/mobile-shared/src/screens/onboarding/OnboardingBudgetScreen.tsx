import { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { BUDGET_OPTIONS } from '../../types/onboarding';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import { ContinueButton } from '../../components/Onboarding';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { trackScreenView, trackClick } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingBudget'>;

const BUDGET_DESCRIPTIONS: Record<string, string> = {
  '$': '💰 Quick bites & casual spots',
  '$$': '🍸 Mid-range dining',
  '$$$': '💎 Fine dining & upscale',
  'All of the above': '🙌 Show me everything',
};

export default function OnboardingBudgetScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const { data, toggleBudget } = useOnboarding();

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const cardsOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const handleContinue = useCallback(() => {
    navigation.navigate('OnboardingEntertainment');
  }, [navigation]);

  useEffect(() => {
    trackScreenView('OnboardingStep_Budget');
  }, []);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    titleTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    cardsOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, []);

  // Show button when 1+ selected
  useEffect(() => {
    if (data.budgetPreferences.length >= 1) {
      buttonOpacity.value = withTiming(1, { duration: 300 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [data.budgetPreferences.length]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const cardsAnimatedStyle = useAnimatedStyle(() => ({ opacity: cardsOpacity.value }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));

  const showButton = data.budgetPreferences.length >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar totalSteps={12} currentStep={8} style={{ paddingHorizontal: 20, paddingTop: 12 }} />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={() => { trackClick('onboarding_skip', undefined); navigation.navigate('OnboardingPremium'); }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>How do you roll?</Text>
          <Text style={styles.subheadline}>Select all that apply</Text>
        </Animated.View>
        <Animated.View style={[styles.cardsContainer, cardsAnimatedStyle]}>
          {BUDGET_OPTIONS.map((option) => {
            const isSelected = data.budgetPreferences.includes(option);
            return (
              <TouchableOpacity key={option} style={[styles.budgetCard, isSelected && styles.budgetCardSelected]} onPress={() => toggleBudget(option)} activeOpacity={0.8}>
                <View style={styles.cardContent}>
                  <Text style={[option.startsWith('$') ? styles.budgetSymbol : styles.budgetLabel, isSelected && styles.budgetSymbolSelected]}>{option}</Text>
                  <Text style={[styles.budgetDescription, isSelected && styles.budgetDescriptionSelected]}>{BUDGET_DESCRIPTIONS[option]}</Text>
                </View>
                {isSelected && <View style={styles.checkmark}><Ionicons name="checkmark" size={20} color={colors.text} /></View>}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
      {showButton && (
        <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
          <ContinueButton onPress={handleContinue} />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  topBar: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
  backButton: { padding: 16 },
  skipButton: { padding: 16 },
  skipText: { fontSize: 15, color: colors.textMuted, fontWeight: '500' as const },
  content: { flex: 1, paddingHorizontal: 24 },
  headerSection: { marginBottom: 32 },
  headline: { fontSize: 28, fontWeight: '700' as const, color: colors.text, marginBottom: 8 },
  subheadline: { fontSize: 16, color: colors.textMuted },
  cardsContainer: { gap: 12 },
  budgetCard: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: 16, borderWidth: 2, borderColor: 'transparent' },
  budgetCardSelected: { borderColor: colors.accent, backgroundColor: colors.cardBgSelected },
  cardContent: { flex: 1 },
  budgetSymbol: { fontSize: 28, fontWeight: '700' as const, color: colors.accent, marginBottom: 2 },
  budgetLabel: { fontSize: 18, fontWeight: '700' as const, color: colors.accent, marginBottom: 2 },
  budgetSymbolSelected: { color: colors.text },
  budgetDescription: { fontSize: 15, color: colors.textMuted },
  budgetDescriptionSelected: { color: colors.textMuted },
  checkmark: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, justifyContent: 'center' as const, alignItems: 'center' as const },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
}));
