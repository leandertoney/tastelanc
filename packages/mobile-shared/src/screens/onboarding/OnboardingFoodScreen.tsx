import { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
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
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { duration, spring, reveal } from '../../constants/animations';
import { MultiSelectGrid, ContinueButton } from '../../components/Onboarding';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingFood'>;

const MAX_SELECTIONS = 3;

const FOOD_GRID_OPTIONS = FOOD_OPTIONS.map((option) => ({
  id: option,
  label: option,
  icon: { 'Modern American': 'restaurant', 'Italian': 'pizza', 'Mediterranean': 'sunny', 'Asian': 'nutrition', 'Latin': 'flame', 'Seafood': 'fish', 'Steakhouse': 'bonfire', 'Pub Food': 'beer' }[option] || 'restaurant',
}));

export default function OnboardingFoodScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const { data, toggleFood } = useOnboarding();

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const contentOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const handleContinue = useCallback(() => {
    navigation.navigate('OnboardingPremium');
  }, [navigation]);

  useEffect(() => {
    titleOpacity.value = withDelay(reveal.header, withTiming(1, { duration: duration.normal }));
    titleTranslate.value = withDelay(reveal.header, withSpring(0, spring.default));
    contentOpacity.value = withDelay(reveal.content, withTiming(1, { duration: duration.normal }));
  }, []);

  // Show button when 1+ selected
  useEffect(() => {
    if (data.foodPreferences.length >= 1) {
      buttonOpacity.value = withTiming(1, { duration: 300 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [data.foodPreferences.length]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));

  const handleToggle = (option: string) => {
    const isCurrentlySelected = data.foodPreferences.includes(option);
    if (isCurrentlySelected || data.foodPreferences.length < MAX_SELECTIONS) toggleFood(option);
  };

  const showButton = data.foodPreferences.length >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.content}>
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>What food do you love?</Text>
          <Text style={styles.subheadline}>{`Pick up to 3 (${data.foodPreferences.length}/3 selected)`}</Text>
        </Animated.View>
        <Animated.View style={[styles.gridContainer, contentAnimatedStyle]}>
          <MultiSelectGrid options={FOOD_GRID_OPTIONS} selected={data.foodPreferences} onToggle={handleToggle} maxSelections={MAX_SELECTIONS} baseDelay={reveal.items} columns={2} />
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
  backButton: { padding: 16 },
  content: { flex: 1, paddingHorizontal: 24 },
  headerSection: { marginBottom: 32 },
  headline: { fontSize: 28, fontWeight: '700' as const, color: colors.text, marginBottom: 8 },
  subheadline: { fontSize: 16, color: colors.textMuted },
  gridContainer: {},
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
}));
