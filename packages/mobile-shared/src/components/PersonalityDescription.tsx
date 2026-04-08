import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createLazyStyles } from '../utils/lazyStyles';
import { getColors } from '../config/theme';
import { radius, spacing, typography } from '../constants/spacing';

const MAX_LINES = 3;
// Rough estimate: 3 lines * ~40 chars per line at subhead size
const CHAR_THRESHOLD = 120;

interface PersonalityDescriptionProps {
  description: string | null;
  name: string;
}

export default function PersonalityDescription({
  description,
}: PersonalityDescriptionProps) {
  const styles = useStyles();
  const colors = getColors();
  const [expanded, setExpanded] = useState(false);

  if (!description) return null;

  const needsTruncation = description.length > CHAR_THRESHOLD;

  return (
    <View style={styles.card}>
      <Text
        style={styles.text}
        numberOfLines={expanded ? undefined : MAX_LINES}
      >
        {description}
      </Text>
      {needsTruncation && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
          <Text style={[styles.toggle, { color: colors.accent }]}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
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
  toggle: {
    fontSize: typography.subhead,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
}));
