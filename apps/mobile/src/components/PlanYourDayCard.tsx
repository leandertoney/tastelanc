/**
 * Home screen entry point card for the "Plan Your Day" feature
 * Vertical layout to match SquadPickerCard height; orange/red accent
 * clearly differentiates it from the indigo Squad Vote card.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography } from '../constants/colors';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PlanYourDayCard() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ItineraryBuilder', {})}
      activeOpacity={0.85}
    >
      {/* Top row: icon (no live dot — this is a solo planner) */}
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="calendar" size={20} color={colors.text} />
        </View>
      </View>

      <Text style={styles.title}>Plan Your Day</Text>
      <Text style={styles.subtitle}>Smart stops for you.</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.callout,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.caption1,
    color: colors.textMuted,
  },
});
