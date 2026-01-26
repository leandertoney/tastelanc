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
        {/* Icon row */}
        <View style={styles.iconRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="map" size={24} color={colors.text} />
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>

        {/* Text content */}
        <Text style={styles.title}>Plan Your Day in Lancaster</Text>
        <Text style={styles.subtitle}>
          Get a personalized itinerary with dining, happy hours, and entertainment all mapped out for you.
        </Text>

        {/* CTA */}
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.title3,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.subhead,
    color: colors.textMuted,
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ctaText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.accent,
  },
});
