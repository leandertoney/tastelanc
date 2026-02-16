import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import {
  BUDGET_OPTIONS,
  ENTERTAINMENT_OPTIONS,
  FOOD_OPTIONS,
} from '../../types/onboarding';
import { colors } from '../../constants/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPreferences'>;

export default function OnboardingPreferencesScreen({ navigation }: Props) {
  const { data, setBudget, toggleEntertainment, toggleFood } = useOnboarding();

  const handleContinue = () => {
    navigation.navigate('OnboardingPremium');
  };

  const renderChip = (
    label: string,
    isSelected: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.chip, isSelected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headline}>Tell us your preferences</Text>
        <Text style={styles.subheadline}>Select all that apply</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.chipContainer}>
            {BUDGET_OPTIONS.map((option) =>
              renderChip(option, data.budget === option, () =>
                setBudget(option)
              )
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entertainment</Text>
          <View style={styles.chipContainer}>
            {ENTERTAINMENT_OPTIONS.map((option) =>
              renderChip(
                option,
                data.entertainmentPreferences.includes(option),
                () => toggleEntertainment(option)
              )
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Interests</Text>
          <View style={styles.chipContainer}>
            {FOOD_OPTIONS.map((option) =>
              renderChip(option, data.foodPreferences.includes(option), () =>
                toggleFood(option)
              )
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
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
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: colors.cardBg,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: colors.cardBgSelected,
    borderColor: colors.accent,
  },
  chipText: {
    fontSize: 15,
    color: colors.text,
  },
  chipTextSelected: {
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
  continueText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
});
