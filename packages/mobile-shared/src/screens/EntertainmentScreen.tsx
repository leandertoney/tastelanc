import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createLazyStyles } from '../utils/lazyStyles';

export default function EntertainmentScreen() {
  const styles = useStyles();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Entertainment</Text>
        <Text style={styles.subtitle}>Live music, trivia, karaoke, and more</Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));
