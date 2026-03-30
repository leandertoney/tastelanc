import { TouchableOpacity, View, Text, Animated, Dimensions } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
const RW_YELLOW_DIM = 'rgba(240,208,96,0.75)';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 16;

const PARTICLES = Array.from({ length: PARTICLE_COUNT }).map((_, i) => ({
  x: Math.random() * (SCREEN_WIDTH - 32),
  size: 12 + Math.random() * 14,
  delay: Math.random() * 300,
  peakY: -(30 + Math.random() * 60),
  driftX: (Math.random() - 0.5) * 100,
  spin: (Math.random() - 0.5) * 480,
  opacity: 0.2 + Math.random() * 0.4,
  burstDuration: 500 + Math.random() * 200,
  fallDuration: 2500 + Math.random() * 1500,
  emoji: i % 3 === 0 ? '🍽️' : '🍴',
}));

function ForkBurst() {
  const anims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const runBurst = () => {
      anims.forEach(a => a.setValue(0));
      const animations = anims.map((anim, i) =>
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 0.35,
            duration: PARTICLES[i].burstDuration,
            delay: PARTICLES[i].delay,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: PARTICLES[i].fallDuration,
            useNativeDriver: true,
          }),
        ])
      );
      Animated.parallel(animations).start();
    };

    runBurst();
    const interval = setInterval(runBurst, 30000);
    return () => clearInterval(interval);
  }, [anims]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        overflow: 'visible',
        zIndex: 10,
      }}
    >
      {PARTICLES.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            bottom: 0,
            fontSize: p.size,
            opacity: anims[i].interpolate({
              inputRange: [0, 0.08, 0.35, 0.85, 1],
              outputRange: [0, p.opacity, p.opacity, p.opacity * 0.4, 0],
            }),
            transform: [
              {
                translateY: anims[i].interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, p.peakY, SCREEN_HEIGHT * 0.6],
                }),
              },
              {
                translateX: anims[i].interpolate({
                  inputRange: [0, 0.35, 1],
                  outputRange: [0, p.driftX * 0.4, p.driftX],
                }),
              },
              {
                rotate: anims[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${p.spin}deg`],
                }),
              },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

function CutleryLogo({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="silverware" size={Math.round(size * 0.9)} color={RW_YELLOW} />
    </View>
  );
}

const TICKER_MESSAGES = [
  'April 13–19 · Lancaster City',
  '20+ Participating Restaurants',
  'Prix Fixe Menus · Exclusive Deals',
  'Lunch & Dinner Specials All Week',
];

function SponsorTicker() {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setIndex(i => (i + 1) % TICKER_MESSAGES.length);
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    }, 2800);
    return () => clearInterval(interval);
  }, [fade]);

  return (
    <Animated.Text style={[{
      fontSize: 8,
      fontWeight: '700',
      color: RW_YELLOW_DIM,
      letterSpacing: 1,
      textTransform: 'uppercase',
      textAlign: 'center',
    }, { opacity: fade }]}>
      {TICKER_MESSAGES[index]}
    </Animated.Text>
  );
}

export default function RestaurantWeekBanner() {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();
  const shimmer = useRef(new Animated.Value(0)).current;


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

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  // Only show for Lancaster (TasteLanc) and when there are active specials
  if (brand.marketSlug !== 'lancaster-pa' || !eventDates.length) return null;

  return (
    <View style={styles.showerContainer}>
      <ForkBurst />
      <Animated.View style={[styles.bannerBorder, {
        borderColor: shimmer.interpolate({ inputRange: [0, 1], outputRange: ['rgba(240,208,96,0.2)', 'rgba(240,208,96,0.75)'] }),
      }]}>
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate('RestaurantWeek')}
        activeOpacity={0.85}
      >
        {/* Watermark utensils in background */}
        <View style={styles.bgUtensil1} pointerEvents="none">
          <MaterialCommunityIcons name="silverware-spoon" size={72} color={RW_YELLOW} />
        </View>
        <View style={styles.bgUtensil2} pointerEvents="none">
          <MaterialCommunityIcons name="silverware-fork-knife" size={56} color={RW_YELLOW} />
        </View>

        <View style={styles.content}>
          {/* Crossed utensils logo */}
          <CutleryLogo size={36} />

          <View style={styles.textGroup}>
            <View style={styles.sponsorPill}>
              <Text style={styles.sponsorPillText}>Official Digital Sponsor · 2026</Text>
            </View>
            <Text style={styles.title}>Restaurant Week</Text>
            <SponsorTicker />
          </View>

          <Animated.View style={[styles.arrow, {
            opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
          }]}>
            <Ionicons name="chevron-forward" size={22} color={RW_YELLOW} />
          </Animated.View>
        </View>

      </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const useStyles = createLazyStyles(() => ({
  showerContainer: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 10,
  },
  bannerBorder: {
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  banner: {
    backgroundColor: RW_TERRACOTTA,
    borderRadius: radius.lg,
    paddingVertical: 9,
    paddingHorizontal: spacing.md + 4,
    overflow: 'hidden',
    position: 'relative',
  },
  // Watermark utensils at low opacity
  bgUtensil1: {
    position: 'absolute',
    right: -8,
    top: -8,
    opacity: 0.12,
    transform: [{ rotate: '-30deg' }],
  },
  bgUtensil2: {
    position: 'absolute',
    left: -6,
    bottom: -8,
    opacity: 0.1,
    transform: [{ rotate: '40deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  textGroup: {
    flex: 1,
    gap: 2,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: RW_YELLOW,
    letterSpacing: -0.3,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 12,
    color: RW_YELLOW_DIM,
    fontWeight: '500',
  },
  sponsorPill: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginBottom: 2,
    alignSelf: 'stretch',
  },
  sponsorPillText: {
    fontSize: 8,
    fontWeight: '700',
    color: RW_YELLOW_DIM,
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.2)',
  },
  partyStripText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(240,208,96,0.7)',
  },
}));
