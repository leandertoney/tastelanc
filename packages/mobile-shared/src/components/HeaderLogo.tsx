import { Text } from 'react-native';
import { getBrand, getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

export default function HeaderLogo() {
  const brand = getBrand();
  const styles = useStyles();

  return <Text style={styles.wordmark}>{brand.appName}</Text>;
}

const useStyles = createLazyStyles((colors) => ({
  wordmark: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: colors.accent,
    letterSpacing: -0.5,
  },
}));
