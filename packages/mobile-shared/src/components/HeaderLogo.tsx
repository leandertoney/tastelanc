import { Text, Platform } from 'react-native';
import { getBrand, getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

export default function HeaderLogo() {
  const brand = getBrand();
  const styles = useStyles();

  return <Text style={styles.logo}>{brand.appName}</Text>;
}

const useStyles = createLazyStyles((colors) => ({
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
    ...Platform.select({
      ios: {
        fontFamily: 'Georgia',
      },
      android: {
        fontFamily: 'serif',
      },
    }),
  },
}));
