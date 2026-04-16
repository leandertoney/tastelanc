import { Text, Platform } from 'react-native';
import { getBrand, getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

export default function HeaderLogo() {
  const brand = getBrand();
  const styles = useStyles();

  return <Text style={styles.wordmark}>{brand.appName}</Text>;
}

const useStyles = createLazyStyles((colors) => ({
  wordmark: {
    fontFamily: Platform.select({
      ios: 'PlayfairDisplay_700Bold',
      android: 'PlayfairDisplay_700Bold',
      default: undefined, // Fallback to system font
    }),
    fontWeight: '700',
    fontSize: 20,
    color: colors.accent,
    letterSpacing: -0.5,
  },
}));
