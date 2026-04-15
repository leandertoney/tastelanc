import { useState, useCallback } from 'react';
import { TouchableOpacity, Text, Dimensions } from 'react-native';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ContinueButtonProps {
  onPress: () => void;
  label?: string;
}

const useStyles = createLazyStyles((colors) => ({
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: radius.full,
    alignSelf: 'center' as const,
    width: SCREEN_WIDTH * 0.85,
    alignItems: 'center' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: colors.textOnAccent,
    letterSpacing: 0.3,
  },
}));

export default function ContinueButton({
  onPress,
  label = 'Continue'
}: ContinueButtonProps) {
  const styles = useStyles();
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = useCallback(() => {
    if (isPressed) return; // Prevent double-tap

    setIsPressed(true);
    onPress();

    // Re-enable after 1 second (in case navigation fails)
    setTimeout(() => setIsPressed(false), 1000);
  }, [isPressed, onPress]);

  return (
    <TouchableOpacity
      style={[styles.button, isPressed && styles.buttonDisabled]}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={isPressed}
    >
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
}
