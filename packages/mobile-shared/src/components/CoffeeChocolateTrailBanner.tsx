import { TouchableOpacity, View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getSupabase, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CCT_PURPLE     = '#5E2077';
const CCT_GOLD       = '#D4AF37';
const CCT_GOLD_DIM   = 'rgba(212,175,55,0.75)';

export default function CoffeeChocolateTrailBanner() {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();
  const shimmer = useRef(new Animated.Value(0)).current;

  const { data: trailCount = 0 } = useQuery({
    queryKey: ['coffeeChocolateTrailCount', brand.marketSlug],
    queryFn: async () => {
      const supabase = getSupabase();
      let marketId: string | null = null;
      if (brand.marketSlug) {
        const { data: m } = await supabase
          .from('markets')
          .select('id')
          .eq('slug', brand.marketSlug)
          .single();
        marketId = m?.id || null;
      }
      let query = supabase
        .from('holiday_specials')
        .select('id, restaurant:restaurants!inner(market_id)', { count: 'exact', head: true })
        .eq('holiday_tag', 'coffee-chocolate-trail-2026')
        .eq('is_active', true);
      if (marketId) query = query.eq('restaurant.market_id', marketId);
      const { count } = await query;
      return count ?? 0;
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  // Only show for Cumberland (TasteCumberland) when trail data is active
  if (brand.marketSlug !== 'cumberland-pa' || trailCount === 0) return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => navigation.navigate('CoffeeChocolateTrail')}
      activeOpacity={0.85}
    >
      {/* Watermark background emojis */}
      <Text style={styles.bgEmoji1}>☕</Text>
      <Text style={styles.bgEmoji2}>🍫</Text>

      <View style={styles.content}>
        {/* Trail icon cluster */}
        <View style={styles.iconCluster}>
          <Text style={styles.iconTop}>☕</Text>
          <Text style={styles.iconBottom}>🍫</Text>
        </View>

        <View style={styles.textGroup}>
          <Text style={styles.title}>Coffee & Chocolate Trail</Text>
          <Text style={styles.subtitle}>Jan 28–May 11 · Cumberland Valley</Text>
          <View style={styles.sponsorPill}>
            <Text style={styles.sponsorPillText}>27 Official Stops</Text>
          </View>
        </View>

        <Animated.View style={[styles.arrow, {
          opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
        }]}>
          <Ionicons name="chevron-forward" size={22} color={CCT_GOLD} />
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles(() => ({
  banner: {
    marginHorizontal: spacing.md,
    backgroundColor: CCT_PURPLE,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(212,175,55,0.4)',
    padding: spacing.md,
    paddingHorizontal: spacing.md + 4,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  bgEmoji1: {
    position: 'absolute',
    right: -6,
    top: -8,
    fontSize: 72,
    opacity: 0.1,
    transform: [{ rotate: '-20deg' }],
  },
  bgEmoji2: {
    position: 'absolute',
    left: -4,
    bottom: -8,
    fontSize: 56,
    opacity: 0.1,
    transform: [{ rotate: '15deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCluster: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTop: {
    fontSize: 18,
    lineHeight: 20,
  },
  iconBottom: {
    fontSize: 16,
    lineHeight: 18,
  },
  textGroup: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: CCT_GOLD,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: CCT_GOLD_DIM,
    fontWeight: '500',
  },
  sponsorPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.3)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  sponsorPillText: {
    fontSize: 8,
    fontWeight: '700',
    color: CCT_GOLD_DIM,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(212,175,55,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}));
