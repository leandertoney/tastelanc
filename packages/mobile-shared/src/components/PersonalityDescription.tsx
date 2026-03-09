import { View, Text } from 'react-native';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing, typography } from '../constants/spacing';

interface PersonalityDescriptionProps {
  description: string | null;
  name: string;
}

export default function PersonalityDescription({
  description,
}: PersonalityDescriptionProps) {
  const styles = useStyles();

  if (!description) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.text}>{description}</Text>
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
}));
