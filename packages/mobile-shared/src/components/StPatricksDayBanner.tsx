import { TouchableOpacity, View, Text, Animated, Dimensions } from 'react-native';
import { useEffect, useRef, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getSupabase, getBrand } from '../config/theme';
import { useMarket } from '../context/MarketContext';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ST_PATS_GREEN = '#0A3D0A';
const SHAMROCK = '#2ECC40';
const GOLD = '#D4AF37';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 18;

// Each shamrock: bursts upward, then gravity pulls it back down past the screen
const PARTICLES = Array.from({ length: PARTICLE_COUNT }).map(() => ({
  x: Math.random() * (SCREEN_WIDTH - 32),
  size: 12 + Math.random() * 16,
  delay: Math.random() * 300,
  // How high it flies up (negative = up)
  peakY: -(30 + Math.random() * 70),
  // Horizontal drift
  driftX: (Math.random() - 0.5) * 120,
  // Spin amount
  spin: (Math.random() - 0.5) * 540,
  opacity: 0.25 + Math.random() * 0.45,
  // Pre-computed durations so they're stable across renders
  burstDuration: 500 + Math.random() * 200,
  fallDuration: 2500 + Math.random() * 1500,
}));

function ShamrockBurst() {
  const anims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;
  const hasPlayed = useRef(false);

  useEffect(() => {
    // Guard: only play once even if component re-mounts or effect re-fires
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    // Phase 1: burst up (fast), Phase 2: drift down (slow, gravity feel)
    const animations = anims.map((anim, i) =>
      Animated.sequence([
        // Burst up
        Animated.timing(anim, {
          toValue: 0.35,
          duration: PARTICLES[i].burstDuration,
          delay: PARTICLES[i].delay,
          useNativeDriver: true,
        }),
        // Fall down slowly
        Animated.timing(anim, {
          toValue: 1,
          duration: PARTICLES[i].fallDuration,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(animations).start();
  }, [anims]);

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
                // Up to peak at 0.35, then fall past screen bottom by 1.0
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
          ☘
        </Animated.Text>
      ))}
    </View>
  );
}

// Build a human-readable date range from event_date strings like "2026-03-13"
function buildDateLabel(dates: string[]): string {
  if (!dates.length) return 'Bar deals for March 17th';
  // Extract day numbers, sort them
  const days = dates
    .map(d => parseInt(d.split('-')[2], 10))
    .filter(n => !isNaN(n))
    .sort((a, b) => a - b);
  if (!days.length) return 'Bar deals for March 17th';
  const first = days[0];
  const last = days[days.length - 1];
  if (first === last) return `Bar deals for March ${first}th`;
  // Use ordinal suffix for first day
  const suffix = (n: number) => {
    if (n === 1 || n === 21 || n === 31) return 'st';
    if (n === 2 || n === 22) return 'nd';
    if (n === 3 || n === 23) return 'rd';
    return 'th';
  };
  return `Bar deals · March ${first}${suffix(first)}–${last}${suffix(last)}`;
}

export default function StPatricksDayBanner() {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();
  const shimmer = useRef(new Animated.Value(0)).current;

  // Fetch distinct event dates for this market's specials
  const { data: eventDates = [] } = useQuery({
    queryKey: ['stPatricksDates', brand.marketSlug],
    queryFn: async () => {
      const supabase = getSupabase();
      let marketId: string | null = null;
      if (brand.marketSlug) {
        const { data: m } = await supabase.from('markets').select('id').eq('slug', brand.marketSlug).single();
        marketId = m?.id || null;
      }
      // Only return dates that haven't fully passed yet (allow same day + 1 day grace)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 1);
      const cutoffStr = cutoff.toISOString().split('T')[0];

      let query = supabase
        .from('holiday_specials')
        .select('event_date, restaurant:restaurants!inner(market_id)')
        .eq('holiday_tag', 'st-patricks-2026')
        .eq('is_active', true)
        .gte('event_date', cutoffStr);
      if (marketId) query = query.eq('restaurant.market_id', marketId);
      const { data } = await query;
      if (!data) return [];
      // Get unique dates
      const unique = Array.from(new Set((data as { event_date: string }[]).map(r => r.event_date)));
      return unique.sort();
    },
    staleTime: 10 * 60 * 1000,
  });

  const dateLabel = useMemo(() => buildDateLabel(eventDates), [eventDates]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  // Only show when there are active specials in the database
  if (!eventDates.length) return null;

  return (
    <View style={styles.showerContainer}>
      <ShamrockBurst />
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate('StPatricksDay')}
        activeOpacity={0.8}
      >
        {/* Background shamrocks */}
        <Text style={styles.bgShamrock1}>☘</Text>
        <Text style={styles.bgShamrock2}>☘</Text>
        <Text style={styles.bgShamrock3}>☘</Text>

        <View style={styles.content}>
          <View style={styles.left}>
            <Text style={styles.emoji}>☘</Text>
            <View>
              <Text style={styles.title}>St. Patrick&apos;s Day Specials</Text>
              <Text style={styles.subtitle}>{dateLabel}</Text>
            </View>
          </View>
          <Animated.View style={[styles.arrow, {
            opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
          }]}>
            <Ionicons name="chevron-forward" size={20} color={GOLD} />
          </Animated.View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const useStyles = createLazyStyles(() => ({
  showerContainer: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 10,
  },
  banner: {
    marginHorizontal: spacing.md,
    backgroundColor: ST_PATS_GREEN,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#2D5A2D',
    padding: spacing.md,
    overflow: 'hidden',
    position: 'relative',
  },
  bgShamrock1: {
    position: 'absolute',
    right: 10,
    top: -5,
    fontSize: 40,
    opacity: 0.08,
    transform: [{ rotate: '15deg' }],
  },
  bgShamrock2: {
    position: 'absolute',
    right: 50,
    bottom: -8,
    fontSize: 28,
    opacity: 0.06,
    transform: [{ rotate: '-20deg' }],
  },
  bgShamrock3: {
    position: 'absolute',
    left: -5,
    bottom: -3,
    fontSize: 32,
    opacity: 0.05,
    transform: [{ rotate: '30deg' }],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#E8F5E8',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: SHAMROCK,
    fontWeight: '500',
    marginTop: 1,
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212,175,55,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}));
