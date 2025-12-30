import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
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
import { colors, radius } from '../../constants/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingBudget'>;

const BUDGET_DESCRIPTIONS: Record<string, string> = {
  '$': 'Quick bites & casual spots',
  '$$': 'Mid-range dining',
  '$$$': 'Fine dining & upscale',
};

export default function OnboardingBudgetScreen({ navigation }: Props) {
  const { data, setBudget } = useOnboarding();
  const hasNavigated = useRef(false);

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const cardsOpacity = useSharedValue(0);

  const handleContinue = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    navigation.navigate('OnboardingEntertainment');
  }, [navigation]);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    titleTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    cardsOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
  }, []);

  // Reset navigation flag when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      hasNavigated.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const cardsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardsOpacity.value,
  }));

  // Single-choice: select and auto-proceed
  const handleSelect = (option: string) => {
    setBudget(option);
    // Small delay so user sees their selection
    setTimeout(() => {
      handleContinue();
    }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>What's your budget?</Text>
          <Text style={styles.subheadline}>Choose one</Text>
        </Animated.View>

        <Animated.View style={[styles.cardsContainer, cardsAnimatedStyle]}>
          {BUDGET_OPTIONS.map((option) => {
            const isSelected = data.budget === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.budgetCard, isSelected && styles.budgetCardSelected]}
                onPress={() => handleSelect(option)}
                activeOpacity={0.8}
              >
                <View style={styles.cardContent}>
                  <Text style={[styles.budgetSymbol, isSelected && styles.budgetSymbolSelected]}>
                    {option}
                  </Text>
                  <Text style={[styles.budgetDescription, isSelected && styles.budgetDescriptionSelected]}>
                    {BUDGET_DESCRIPTIONS[option]}
                  </Text>
                </View>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={20} color={colors.text} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerSection: {
    marginBottom: 32,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 16,
    color: colors.textMuted,
  },
  cardsContainer: {
    gap: 16,
  },
  budgetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 24,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  budgetCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.cardBgSelected,
  },
  cardContent: {
    flex: 1,
  },
  budgetSymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 4,
  },
  budgetSymbolSelected: {
    color: colors.text,
  },
  budgetDescription: {
    fontSize: 15,
    color: colors.textMuted,
  },
  budgetDescriptionSelected: {
    color: colors.textMuted,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
