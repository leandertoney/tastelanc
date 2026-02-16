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
  withSpring,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { FOOD_OPTIONS } from '../../types/onboarding';
import { colors } from '../../constants/colors';
import { duration, spring, reveal } from '../../constants/animations';
import { MultiSelectGrid } from '../../components/Onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingFood'>;

const MAX_SELECTIONS = 3;
const AUTO_PROCEED_DELAY = 2000; // 2 seconds

const FOOD_GRID_OPTIONS = FOOD_OPTIONS.map((option) => ({
  id: option,
  label: option,
  icon: {
    'Modern American': 'restaurant',
    'Italian': 'pizza',
    'Mediterranean': 'sunny',
    'Asian': 'nutrition',
    'Latin': 'flame',
    'Seafood': 'fish',
    'Steakhouse': 'bonfire',
    'Pub Food': 'beer',
  }[option] || 'restaurant',
}));

export default function OnboardingFoodScreen({ navigation }: Props) {
  const { data, toggleFood } = useOnboarding();
  const autoProceedTimer = useRef<NodeJS.Timeout | null>(null);
  const hasNavigated = useRef(false);

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const contentOpacity = useSharedValue(0);

  const handleContinue = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    if (autoProceedTimer.current) {
      clearTimeout(autoProceedTimer.current);
    }
    navigation.navigate('OnboardingPremium');
  }, [navigation]);

  useEffect(() => {
    titleOpacity.value = withDelay(reveal.header, withTiming(1, { duration: duration.normal }));
    titleTranslate.value = withDelay(reveal.header, withSpring(0, spring.default));
    contentOpacity.value = withDelay(reveal.content, withTiming(1, { duration: duration.normal }));
  }, []);

  // Auto-proceed logic
  useEffect(() => {
    const selectionCount = data.foodPreferences.length;

    // Clear any existing timer
    if (autoProceedTimer.current) {
      clearTimeout(autoProceedTimer.current);
      autoProceedTimer.current = null;
    }

    // If 3 selected, proceed immediately
    if (selectionCount >= MAX_SELECTIONS) {
      handleContinue();
      return;
    }

    // If 2 selected, start 2-second timer
    if (selectionCount === 2) {
      autoProceedTimer.current = setTimeout(() => {
        handleContinue();
      }, AUTO_PROCEED_DELAY);
    }

    return () => {
      if (autoProceedTimer.current) {
        clearTimeout(autoProceedTimer.current);
      }
    };
  }, [data.foodPreferences.length, handleContinue]);

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

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleToggle = (option: string) => {
    const isCurrentlySelected = data.foodPreferences.includes(option);
    // Only allow selection if under max OR if deselecting
    if (isCurrentlySelected || data.foodPreferences.length < MAX_SELECTIONS) {
      toggleFood(option);
    }
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
          <Text style={styles.headline}>What food do you love?</Text>
          <Text style={styles.subheadline}>
            Pick up to 3 ({data.foodPreferences.length}/3 selected)
          </Text>
        </Animated.View>

        <Animated.View style={[styles.gridContainer, contentAnimatedStyle]}>
          <MultiSelectGrid
            options={FOOD_GRID_OPTIONS}
            selected={data.foodPreferences}
            onToggle={handleToggle}
            maxSelections={MAX_SELECTIONS}
            baseDelay={reveal.items}
            columns={2}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF6E7',
  },
  backButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerSection: {
    marginBottom: 24,
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
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
