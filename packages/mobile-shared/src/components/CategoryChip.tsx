import { TouchableOpacity, Text } from 'react-native';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';

interface CategoryChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function CategoryChip({ label, selected = false, onPress }: CategoryChipProps) {
  const styles = useStyles();

  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles((colors) => ({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.accent,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.text,
  },
}));
