/**
 * Home screen entry point card for the "Plan Your Day" feature
 * Appears between Events and Featured sections on the Home screen
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography } from '../constants/colors';
import type { RootStackParamList } from '../navigation/types';
import { BRAND } from '../config/brand';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PlanYourDayCard() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ItineraryBuilder', {})}
        activeOpacity={0.85}
      >
        <View style={styles.iconCircle}>
          <Ionicons name="map" size={18} color={colors.textOnAccent} />
        </View>

        <View style={styles.textColumn}>
          <Text style={styles.title}>Plan Your Perfect Day</Text>
          <Text style={styles.subtitle}>
            Pick a day, set the vibe.
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.subhead,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    lineHeight: 16,
  },
});
