import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/colors';

interface PersonalityDescriptionProps {
  description: string | null;
  name: string;
}

export default function PersonalityDescription({
  description,
}: PersonalityDescriptionProps) {
  if (!description) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  text: {
    fontSize: typography.subhead,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
