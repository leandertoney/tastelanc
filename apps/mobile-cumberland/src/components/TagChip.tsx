import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/colors';

interface TagChipProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'info';
}

export default function TagChip({ label, variant = 'default' }: TagChipProps) {
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

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginRight: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
});
