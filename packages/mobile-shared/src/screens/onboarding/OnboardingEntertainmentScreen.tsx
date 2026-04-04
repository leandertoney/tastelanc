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
import { ENTERTAINMENT_OPTIONS } from '../../types/onboarding';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { duration, spring, reveal } from '../../constants/animations';
import { MultiSelectGrid, ContinueButton } from '../../components/Onboarding';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { trackScreenView, trackClick } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingEntertainment'>;

const MAX_SELECTIONS = 3;

const ENTERTAINMENT_EMOJI: Record<string, string> = {
  'Date night': '💑',
  'Casual hangout': '😎',
  'After work drinks': '🍺',
  'Weekend brunch': '🥂',
  'Late night eats': '🌙',
  'Special occasion': '✨',
};

const ENTERTAINMENT_GRID_OPTIONS = ENTERTAINMENT_OPTIONS.map((option) => ({
  id: option,
  label: ENTERTAINMENT_EMOJI[option] ? `${ENTERTAINMENT_EMOJI[option]} ${option}` : option,
  icon: { 'Date night': 'heart', 'Casual hangout': 'people', 'After work drinks': 'beer', 'Weekend brunch': 'cafe', 'Late night eats': 'moon', 'Special occasion': 'sparkles' }[option] || 'ellipse',
}));

export default function OnboardingEntertainmentScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const { data, toggleEntertainment } = useOnboarding();

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const contentOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const handleContinue = useCallback(() => {
    navigation.navigate('OnboardingFood');
  }, [navigation]);

  useEffect(() => {
    trackScreenView('OnboardingStep_Entertainment');
  }, []);

  useEffect(() => {
    titleOpacity.value = withDelay(reveal.header, withTiming(1, { duration: duration.normal }));
    titleTranslate.value = withDelay(reveal.header, withSpring(0, spring.default));
    contentOpacity.value = withDelay(reveal.content, withTiming(1, { duration: duration.normal }));
  }, []);

  // Show button when 1+ selected
  useEffect(() => {
    if (data.entertainmentPreferences.length >= 1) {
      buttonOpacity.value = withTiming(1, { duration: 300 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [data.entertainmentPreferences.length]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));

  const handleToggle = (option: string) => {
    const isCurrentlySelected = data.entertainmentPreferences.includes(option);
    if (isCurrentlySelected || data.entertainmentPreferences.length < MAX_SELECTIONS) toggleEntertainment(option);
  };

  const showButton = data.entertainmentPreferences.length >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar totalSteps={12} currentStep={9} style={{ paddingHorizontal: 20, paddingTop: 12 }} />
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
          <Text style={styles.headline}>What's your vibe?</Text>
          <Text style={styles.subheadline}>{`Pick up to 3 (${data.entertainmentPreferences.length}/3 selected)`}</Text>
        </Animated.View>
        <Animated.View style={[styles.gridContainer, contentAnimatedStyle]}>
          <MultiSelectGrid options={ENTERTAINMENT_GRID_OPTIONS} selected={data.entertainmentPreferences} onToggle={handleToggle} maxSelections={MAX_SELECTIONS} baseDelay={reveal.items} columns={2} />
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
  gridContainer: {},
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
}));
