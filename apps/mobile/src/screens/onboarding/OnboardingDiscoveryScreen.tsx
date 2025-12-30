import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { DISCOVERY_OPTIONS } from '../../types/onboarding';
import { colors } from '../../constants/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingDiscovery'>;

const DISCOVERY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Instagram': 'logo-instagram',
  'Facebook': 'logo-facebook',
  'TikTok': 'logo-tiktok',
  'Friend': 'people-outline',
  'ChatGPT / AI': 'chatbubble-outline',
  'Bar / Restaurant': 'restaurant-outline',
  'Google': 'logo-google',
  'Other': 'ellipsis-horizontal-outline',
};

export default function OnboardingDiscoveryScreen({ navigation }: Props) {
  const { data, setDiscoverySource } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.discoverySource);

  const handleSelect = (option: string) => {
    setSelected(option);
    setDiscoverySource(option);
  };

  const handleContinue = () => {
    if (selected) {
      navigation.navigate('OnboardingPremium');
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headline}>How did you hear about us?</Text>
        <Text style={styles.subheadline}>We'd love to know how you found TasteLanc</Text>

        <View style={styles.options}>
          {DISCOVERY_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.option, selected === option && styles.optionSelected]}
              onPress={() => handleSelect(option)}
            >
              <Ionicons
                name={DISCOVERY_ICONS[option] || 'help-outline'}
                size={24}
                color={selected === option ? colors.accent : colors.text}
              />
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
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, !selected && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
        >
          <Text style={styles.continueText}>Next</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    gap: 12,
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
    flex: 1,
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
