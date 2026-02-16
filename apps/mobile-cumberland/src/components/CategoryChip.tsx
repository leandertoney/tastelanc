import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../constants/colors';

interface CategoryChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function CategoryChip({ label, selected = false, onPress }: CategoryChipProps) {
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

const styles = StyleSheet.create({
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
    fontWeight: '500',
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.text,
  },
});
