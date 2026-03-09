import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';

export default function CategoriesScreen() {
  const styles = useStyles();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Categories</Text>
        <Text style={styles.subtitle}>Browse by category: bars, brunch, dinner, and more</Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center' as const,
  },
}));
