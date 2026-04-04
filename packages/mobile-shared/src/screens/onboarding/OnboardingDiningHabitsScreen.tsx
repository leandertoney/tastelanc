import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import { FREQUENCY_OPTIONS } from '../../types/onboarding';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import { duration, spring, reveal } from '../../constants/animations';
import { trackScreenView, trackClick } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingDiningHabits'>;

const OPTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Every day': 'flame',
  'A few times a week': 'calendar',
  'Once a week': 'restaurant',
  'Once a month': 'time',
  'Just exploring': 'compass',
};

export default function OnboardingDiningHabitsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const { data, setFrequency } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.frequency);
  const userName = data.name;

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const optionsOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_DiningHabits');
  }, []);

  useEffect(() => {
    titleOpacity.value = withDelay(reveal.header, withTiming(1, { duration: duration.normal }));
    titleTranslate.value = withDelay(reveal.header, withSpring(0, spring.default));
    optionsOpacity.value = withDelay(reveal.content, withTiming(1, { duration: duration.normal }));
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const optionsAnimatedStyle = useAnimatedStyle(() => ({ opacity: optionsOpacity.value }));

  const handleSelect = (option: string) => {
    setSelected(option);
    setFrequency(option);
    setTimeout(() => { navigation.navigate('OnboardingEventSeeking'); }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
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
          {userName && <Text style={styles.greeting}>{`Nice to meet you, ${userName}!`}</Text>}
          <Text style={styles.headline}>How often do you eat out?</Text>
          <Text style={styles.subheadline}>{`In ${brand.cityName}, of course`}</Text>
        </Animated.View>
        <Animated.View style={optionsAnimatedStyle}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.optionsContainer}>
            {FREQUENCY_OPTIONS.map((option) => {
              const isSelected = selected === option;
              return (
                <TouchableOpacity key={option} style={[styles.optionCard, isSelected && styles.optionCardSelected]} onPress={() => handleSelect(option)} activeOpacity={0.8}>
                  <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                    <Ionicons name={OPTION_ICONS[option] || 'restaurant'} size={24} color={isSelected ? colors.textOnAccent : colors.accent} />
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{option}</Text>
                  {isSelected && <View style={styles.checkmark}><Ionicons name="checkmark" size={20} color={colors.textOnAccent} /></View>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
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
  greeting: { fontSize: 16, fontWeight: '500' as const, color: colors.accent, marginBottom: 8 },
  headline: { fontSize: 28, fontWeight: '700' as const, color: colors.text, marginBottom: 8 },
  subheadline: { fontSize: 16, color: colors.textMuted },
  optionsContainer: { gap: 12, paddingBottom: 24 },
  optionCard: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: 20, borderWidth: 2, borderColor: 'transparent' },
  optionCardSelected: { borderColor: colors.accent, backgroundColor: colors.cardBgSelected },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.cardBgElevated, justifyContent: 'center' as const, alignItems: 'center' as const, marginRight: 16 },
  iconContainerSelected: { backgroundColor: colors.accent },
  optionText: { flex: 1, fontSize: 17, fontWeight: '500' as const, color: colors.text },
  optionTextSelected: { fontWeight: '600' as const },
  checkmark: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, justifyContent: 'center' as const, alignItems: 'center' as const },
}));
