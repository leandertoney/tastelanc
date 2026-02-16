import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../constants/colors';

interface PersonalityDescriptionProps {
  description: string | null;
  name: string;
}

function extractPullQuote(description: string): { pullQuote: string; rest: string | null } {
  // Try to extract the first sentence as a pull quote
  const match = description.match(/^(.+?[.!?])\s+(.+)$/s);
  if (match) {
    return { pullQuote: match[1], rest: match[2] };
  }
  // If no sentence boundary found, use the whole description as pull quote
  return { pullQuote: description, rest: null };
}

export default function PersonalityDescription({
  description,
  name,
}: PersonalityDescriptionProps) {
  if (!description) return null;

  const { pullQuote, rest } = extractPullQuote(description);

  return (
    <View style={styles.card}>
      {/* Pull quote with gold accent bar */}
      <View style={styles.pullQuoteRow}>
        <View style={styles.accentBar} />
        <Text style={styles.pullQuoteText}>{pullQuote}</Text>
      </View>

      {/* Remaining description */}
      {rest && <Text style={styles.bodyText}>{rest}</Text>}
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
  pullQuoteRow: {
    flexDirection: 'row',
  },
  accentBar: {
    width: 3,
    backgroundColor: colors.gold,
    borderRadius: 2,
    marginRight: 12,
  },
  pullQuoteText: {
    flex: 1,
    fontSize: typography.title3,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 28,
  },
  bodyText: {
    fontSize: typography.subhead,
    lineHeight: 22,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
