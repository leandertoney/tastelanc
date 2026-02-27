/**
 * Home screen entry point card for the "What's the Move?" feature
 * Full-width horizontal layout: icon → text → chevron
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
      <View style={styles.iconCircle}>
        <Ionicons name="calendar" size={20} color={colors.text} />
      </View>

      <View style={styles.textBlock}>
        <Text style={styles.title}>Plan Your Perfect Day</Text>
        <Text style={styles.subtitle}>Pick a day, set the vibe.</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textBlock: {
    flex: 1,
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
