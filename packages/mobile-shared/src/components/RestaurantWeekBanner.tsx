import { TouchableOpacity, View, Text, Animated } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getSupabase, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RW_TERRACOTTA = '#C8532A';
const RW_YELLOW = '#F0D060';
const RW_TEXT_WHITE = '#FFFFFF';

const TICKER_MESSAGES = [
  'April 13–19 · Lancaster City',
  '20+ Participating Restaurants',
  'Prix Fixe Menus · Exclusive Deals',
  'Lunch & Dinner Specials All Week',
];

function TickerText() {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setIndex(i => (i + 1) % TICKER_MESSAGES.length);
        Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [fade]);

  return (
    <Animated.Text style={[tickerStyles.text, { opacity: fade }]} numberOfLines={1}>
      {TICKER_MESSAGES[index]}
    </Animated.Text>
  );
}

const tickerStyles = {
  text: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: RW_TEXT_WHITE,
    textAlign: 'center' as const,
    letterSpacing: 0.3,
  },
};

export default function RestaurantWeekBanner() {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();

  const { data: eventDates = [] } = useQuery({
    queryKey: ['restaurantWeekDates', brand.marketSlug],
    queryFn: async () => {
      const supabase = getSupabase();
      let marketId: string | null = null;
      if (brand.marketSlug) {
        const { data: m } = await supabase.from('markets').select('id').eq('slug', brand.marketSlug).single();
        marketId = m?.id || null;
      }
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 1);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      let query = supabase
        .from('holiday_specials')
        .select('event_date, restaurant:restaurants!inner(market_id)')
        .eq('holiday_tag', 'restaurant-week-2026')
        .eq('is_active', true)
        .gte('event_date', cutoffStr);
      if (marketId) query = query.eq('restaurant.market_id', marketId);
      const { data } = await query;
      if (!data) return [];
      const unique = Array.from(new Set((data as { event_date: string }[]).map(r => r.event_date)));
      return unique.sort();
    },
    staleTime: 10 * 60 * 1000,
  });

  if (brand.marketSlug !== 'lancaster-pa' || !eventDates.length) return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => navigation.navigate('RestaurantWeek')}
      activeOpacity={0.85}
    >
      <Text style={styles.bookend}>RW26</Text>
      <View style={styles.divider} />
      <View style={styles.tickerContainer}>
        <TickerText />
      </View>
      <View style={styles.divider} />
      <Text style={styles.bookend}>RW26</Text>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles(() => ({
  banner: {
    marginHorizontal: spacing.md,
    backgroundColor: RW_TERRACOTTA,
    borderRadius: radius.md,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  bookend: {
    fontSize: 11,
    fontWeight: '900',
    color: RW_YELLOW,
    letterSpacing: 1.5,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: 'rgba(240,208,96,0.3)',
    marginHorizontal: 10,
  },
  tickerContainer: {
    flex: 1,
    alignItems: 'center',
  },
}));
