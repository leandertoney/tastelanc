import { TouchableOpacity, Text, StyleSheet, Dimensions } from 'react-native';
import { colors, radius } from '../../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ContinueButtonProps {
  onPress: () => void;
  label?: string;
}

export default function ContinueButton({
  onPress,
  label = 'Continue'
}: ContinueButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    alignSelf: 'center',
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center',
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.3,
  },
});
