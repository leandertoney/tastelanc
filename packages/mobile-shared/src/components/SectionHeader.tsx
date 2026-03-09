import { View, Text, TouchableOpacity } from 'react-native';
import { createLazyStyles } from '../utils/lazyStyles';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
}

export default function SectionHeader({ title, subtitle, actionText, onActionPress }: SectionHeaderProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {actionText && onActionPress && (
        <TouchableOpacity onPress={onActionPress}>
          <Text style={styles.action}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  action: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.accent,
  },
}));
