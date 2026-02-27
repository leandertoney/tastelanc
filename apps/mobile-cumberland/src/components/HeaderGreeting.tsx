import { Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getUserPreferences, getPersonalizedGreeting } from '../lib/recommendations';
import { colors } from '../constants/colors';

export default function HeaderGreeting() {
  const { data: greeting } = useQuery({
    queryKey: ['personalizedGreeting'],
    queryFn: async () => {
      const prefs = await getUserPreferences();
      return getPersonalizedGreeting(prefs);
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!greeting) return null;

  // Show just the time-of-day greeting without the user's name (App Store screenshot safe)
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
