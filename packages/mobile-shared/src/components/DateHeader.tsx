import { View, Text } from 'react-native';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, typography } from '../constants/spacing';

interface DateHeaderProps {
  date: string; // ISO date string (e.g., "2024-12-13") or "recurring" for recurring events
}

/**
 * Formats an ISO date string to a readable format: "Saturday, December 13"
 */
function formatDateHeader(dateString: string): string {
  if (dateString === 'recurring') {
    return 'Recurring Events';
  }

  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function DateHeader({ date }: DateHeaderProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{formatDateHeader(date)}</Text>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  text: {
    fontSize: typography.subhead,
    fontWeight: '600' as const,
    color: colors.textMuted,
  },
}));
