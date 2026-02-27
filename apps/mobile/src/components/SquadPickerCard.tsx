/**
 * Home screen entry point card for the "Squad Picker" feature
 * Lets a group vote on where to eat — appears next to Plan Your Day card
 */

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography } from '../constants/colors';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SquadPickerCard() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SquadBuilder')}
      activeOpacity={0.85}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="people" size={18} color={colors.text} />
      </View>

      <View style={styles.textColumn}>
        <Text style={styles.title}>Squad Picker</Text>
        <Text style={styles.subtitle}>
          Let the group vote on where to eat.
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
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
