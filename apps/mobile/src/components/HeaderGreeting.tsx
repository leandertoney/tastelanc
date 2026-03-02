import { Text, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function HeaderGreeting() {
  const hour = new Date().getHours();
  const timeOnly = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  return (
    <Text style={styles.greeting} numberOfLines={1}>
      {timeOnly}
    </Text>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
    maxWidth: 180,
  },
});
