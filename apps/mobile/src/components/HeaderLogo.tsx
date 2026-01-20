import { Image, StyleSheet } from 'react-native';

const logo = require('../../assets/icon.png');

export default function HeaderLogo() {
  return <Image source={logo} style={styles.logo} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  logo: {
    height: 32,
    width: 32,
    marginLeft: 8,
    borderRadius: 6,
    borderWidth: 0.25,
    borderColor: '#A41E22',
  },
});
