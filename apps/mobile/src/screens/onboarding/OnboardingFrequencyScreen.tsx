import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { FREQUENCY_OPTIONS } from '../../types/onboarding';
import { colors } from '../../constants/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingFrequency'>;

export default function OnboardingFrequencyScreen({ navigation }: Props) {
  const { data, setFrequency } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.frequency);

  const handleSelect = (option: string) => {
    setSelected(option);
    setFrequency(option);
  };

  const handleContinue = () => {
    if (selected) {
      navigation.navigate('OnboardingDiscovery');
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
        <Text style={styles.headline}>How often do you dine or go out in Lancaster?</Text>
        <Text style={styles.subheadline}>This helps us personalize your experience</Text>

        <View style={styles.options}>
          {FREQUENCY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.option, selected === option && styles.optionSelected]}
              onPress={() => handleSelect(option)}
            >
              <Text
                style={[styles.optionText, selected === option && styles.optionTextSelected]}
              >
                {option}
              </Text>
              {selected === option && (
                <Ionicons name="checkmark-circle" size={24} color={colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
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
  headline: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 32,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.cardBg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    backgroundColor: colors.cardBgSelected,
    borderColor: colors.accent,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
    backgroundColor: colors.accent,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  continueText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
