/**
 * OnboardingThemePickerScreen — shown once, right after onboarding completes.
 * Lets the user choose Dark / Dim / Light before they first see the home screen.
 * Gated by AsyncStorage '@theme_picker_shown' so it only appears once.
 */
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { useTheme } from '../../context/ThemeContext';
import { useNavigationActions } from '../../context/NavigationActionsContext';
import type { ThemeMode } from '../../types/config';
import { radius } from '../../constants/spacing';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingThemePicker'>;

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string; description: string }[] = [
  { mode: 'dark',  label: 'Dark',  icon: 'moon',     description: 'Classic. Bold. Easy on the eyes.' },
  { mode: 'dim',   label: 'Dim',   icon: 'contrast', description: 'Softer darks. Still easy at night.' },
  { mode: 'light', label: 'Light', icon: 'sunny',    description: 'Bright and crisp. Great in daylight.' },
];

export default function OnboardingThemePickerScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const { themeMode, setThemeMode, availableModes } = useTheme();
  const { finishOnboarding } = useNavigationActions();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const visibleOptions = THEME_OPTIONS.filter(
    (opt) => availableModes.includes(opt.mode),
  );

  const handleContinue = () => {
    finishOnboarding();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.headline}>Choose your look</Text>
          <Text style={styles.subheadline}>
            You can always change this in{'\n'}Settings → Appearance.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          {visibleOptions.map((opt) => {
            const isActive = themeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                style={[styles.optionCard, isActive && styles.optionCardActive]}
                onPress={() => setThemeMode(opt.mode)}
                activeOpacity={0.75}
              >
                <View style={[styles.optionIconWrap, isActive && styles.optionIconWrapActive]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={26}
                    color={isActive ? colors.textOnAccent : colors.textMuted}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optionDesc, isActive && styles.optionDescActive]}>
                    {opt.description}
                  </Text>
                </View>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueText}>Let's Go</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textOnAccent} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  header: { marginBottom: 36 },
  headline: {
    fontSize: 30,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 10,
  },
  subheadline: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
  },
  optionsContainer: { gap: 12 },
  optionCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 14,
  },
  optionCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.cardBgSelected,
  },
  optionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  optionIconWrapActive: {
    backgroundColor: colors.accent,
  },
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 3,
  },
  optionLabelActive: { color: colors.text },
  optionDesc: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  optionDescActive: { color: colors.textMuted },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  continueButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 16,
    borderRadius: radius.full,
    gap: 8,
  },
  continueText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.textOnAccent,
  },
}));
