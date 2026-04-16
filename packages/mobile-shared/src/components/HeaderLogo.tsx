import { Image } from 'react-native';
import { getAssets, getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

export default function HeaderLogo() {
  const assets = getAssets();
  const styles = useStyles();

  return <Image source={assets.appIcon} style={styles.logo} resizeMode="contain" />;
}

const useStyles = createLazyStyles((colors) => ({
  logo: {
    height: 32,
    width: 32,
    borderRadius: 6,
    borderWidth: 0.25,
    borderColor: colors.accent,
  },
}));
