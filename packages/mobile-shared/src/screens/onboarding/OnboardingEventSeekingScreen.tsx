import { useEffect, useRef, useCallback } from 'react';
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
import { EVENT_OPTIONS } from '../../types/onboarding';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { duration, spring, reveal } from '../../constants/animations';
import { MultiSelectGrid, ContinueButton } from '../../components/Onboarding';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingEventSeeking'>;

const MAX_SELECTIONS = 3;

const EVENT_EMOJI: Record<string, string> = {
  'Live Music': '🎵',
  'Trivia': '🧠',
  'Comedy': '😂',
  'Sports': '🏆',
  'Wine Tastings': '🍷',
  'Networking': '🤝',
  'Karaoke': '🎤',
  'DJ Nights': '🎧',
};

const EVENT_GRID_OPTIONS = EVENT_OPTIONS.map((option) => ({
  id: option,
  label: EVENT_EMOJI[option] ? `${EVENT_EMOJI[option]} ${option}` : option,
  icon: { 'Live Music': 'musical-notes', 'Trivia': 'help-circle', 'Comedy': 'happy', 'Sports': 'football', 'Wine Tastings': 'wine', 'Networking': 'people', 'Karaoke': 'mic', 'DJ Nights': 'disc' }[option] || 'ellipse',
}));

export default function OnboardingEventSeekingScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const { data, toggleEventPreference } = useOnboarding();
  const hasNavigated = useRef(false);

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const contentOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const handleContinue = useCallback(() => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    navigation.navigate('OnboardingBudget');
  }, [navigation]);

  useEffect(() => {
    titleOpacity.value = withDelay(reveal.header, withTiming(1, { duration: duration.normal }));
    titleTranslate.value = withDelay(reveal.header, withSpring(0, spring.default));
    contentOpacity.value = withDelay(reveal.content, withTiming(1, { duration: duration.normal }));
  }, []);

  // Auto-advance at 3 selections, show button at 2+
  useEffect(() => {
    const selectionCount = data.eventPreferences.length;
    if (selectionCount >= MAX_SELECTIONS) {
      handleContinue();
      return;
    }
    if (selectionCount >= 1) {
      buttonOpacity.value = withTiming(1, { duration: 300 });
    } else {
      buttonOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [data.eventPreferences.length, handleContinue]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => { hasNavigated.current = false; });
    return unsubscribe;
  }, [navigation]);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const contentAnimatedStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));

  const handleToggle = (option: string) => {
    const isCurrentlySelected = data.eventPreferences.includes(option);
    if (isCurrentlySelected || data.eventPreferences.length < MAX_SELECTIONS) toggleEventPreference(option);
  };

  const showButton = data.eventPreferences.length >= 1;

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar totalSteps={12} currentStep={7} style={{ paddingHorizontal: 20, paddingTop: 12 }} />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={() => navigation.navigate('OnboardingPremium')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>What events are you into?</Text>
          <Text style={styles.subheadline}>{`Pick up to 3 (${data.eventPreferences.length}/3 selected)`}</Text>
        </Animated.View>
        <Animated.View style={[styles.gridContainer, contentAnimatedStyle]}>
          <MultiSelectGrid options={EVENT_GRID_OPTIONS} selected={data.eventPreferences} onToggle={handleToggle} maxSelections={MAX_SELECTIONS} baseDelay={reveal.items} columns={2} />
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
