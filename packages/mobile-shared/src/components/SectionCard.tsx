import { View, Text, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';

interface SectionCardProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  style?: ViewStyle;
}

export default function SectionCard({ title, icon, children, style }: SectionCardProps) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        {icon && (
          <Ionicons name={icon} size={20} color={colors.accent} style={styles.icon} />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    backgroundColor: colors.cardBg,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: radius.md,
    padding: 16,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  content: {},
}));
