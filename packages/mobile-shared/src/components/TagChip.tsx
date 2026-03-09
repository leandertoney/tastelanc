import { View, Text } from 'react-native';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';

interface TagChipProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export default function TagChip({ label, variant = 'default' }: TagChipProps) {
  const styles = useStyles();
  const colors = getColors();

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return { backgroundColor: `${colors.success}20`, textColor: colors.success };
      case 'warning':
        return { backgroundColor: `${colors.warning}20`, textColor: colors.warning };
      case 'info':
        return { backgroundColor: `${colors.info}20`, textColor: colors.info };
      default:
        return { backgroundColor: colors.cardBgElevated, textColor: colors.textMuted };
    }
  };

  const { backgroundColor, textColor } = getVariantStyles();

  return (
    <View style={[styles.chip, { backgroundColor }]}>
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const useStyles = createLazyStyles((_colors) => ({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
}));
