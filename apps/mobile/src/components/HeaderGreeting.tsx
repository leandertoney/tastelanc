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

  // Show just the short greeting part (e.g. "Good Evening, Leander!")
  // Extract up to the first ! or ? to keep it compact, then title-case
  const short = greeting
    .split(/[!?]/)[0]
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Text style={styles.greeting} numberOfLines={1}>
      {short}
    </Text>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 12,
    maxWidth: 140,
  },
});
