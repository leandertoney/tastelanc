import { Text } from 'react-native';
import { createLazyStyles } from '../utils/lazyStyles';

export default function HeaderGreeting() {
  const hour = new Date().getHours();
  const timeOnly = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const styles = useStyles();

  return (
    <Text style={styles.greeting} numberOfLines={1}>
      {timeOnly}
    </Text>
  );
}

const useStyles = createLazyStyles((colors) => ({
  greeting: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
    maxWidth: 180,
  },
}));
