import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { colors, radius } from '../../constants/colors';
import { duration, spring, reveal, stagger } from '../../constants/animations';
import { BRAND } from '../../config/brand';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingDiningHabits'>;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const OPTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Every day': 'flame',
  'A few times a week': 'calendar',
  'Once a week': 'restaurant',
  'Once a month': 'time',
  'Just exploring': 'compass',
};

export default function OnboardingDiningHabitsScreen({ navigation }: Props) {
  const { data, setFrequency } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.frequency);
  const userName = data.name;

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const optionsOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withDelay(reveal.header, withTiming(1, { duration: duration.normal }));
    titleTranslate.value = withDelay(reveal.header, withSpring(0, spring.default));
    optionsOpacity.value = withDelay(reveal.content, withTiming(1, { duration: duration.normal }));
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const optionsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: optionsOpacity.value,
  }));

  const handleSelect = (option: string) => {
    setSelected(option);
    setFrequency(option);
    // Auto-advance after brief delay for visual feedback
    setTimeout(() => {
      navigation.navigate('OnboardingEventSeeking');
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
          {userName && (
            <Text style={styles.greeting}>Nice to meet you, {userName}!</Text>
          )}
          <Text style={styles.headline}>How often do you eat out?</Text>
          <Text style={styles.subheadline}>{`In ${BRAND.cityName}, of course`}</Text>
        </Animated.View>

        <Animated.View style={optionsAnimatedStyle}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.optionsContainer}
          >
            {FREQUENCY_OPTIONS.map((option, index) => {
              const isSelected = selected === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => handleSelect(option)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                    <Ionicons
                      name={OPTION_ICONS[option] || 'restaurant'}
                      size={24}
                      color={isSelected ? colors.textOnAccent : colors.accent}
                    />
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option}
                  </Text>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={20} color={colors.textOnAccent} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.accent,
    marginBottom: 8,
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
  optionsContainer: {
    gap: 12,
    paddingBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.cardBgSelected,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: colors.accent,
  },
  optionText: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
