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
      ios: 'Georgia', // Elegant serif font on iOS
      android: 'serif', // Serif font on Android
      default: undefined,
    }),
    fontWeight: '700',
    fontSize: 20,
    color: colors.accent,
    letterSpacing: -0.5,
  },
}));
