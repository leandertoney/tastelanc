/**
 * Home screen entry point card for "Squad Vote"
 * Visually distinct from PlanYourDayCard — indigo accent, flash icon,
 * live dot badge to reinforce the social/voting energy.
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography } from '../constants/colors';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SQUAD_INDIGO = '#6C63FF';

export default function SquadPickerCard() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SquadBuilder')}
      activeOpacity={0.85}
    >
      {/* Top row: icon + live dot */}
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="flash" size={20} color={colors.text} />
        </View>
        <View style={styles.liveDot} />
      </View>

      <Text style={styles.title}>Squad Vote</Text>
      <Text style={styles.subtitle}>Let Lancaster decide.</Text>
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
    borderColor: SQUAD_INDIGO,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SQUAD_INDIGO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
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
