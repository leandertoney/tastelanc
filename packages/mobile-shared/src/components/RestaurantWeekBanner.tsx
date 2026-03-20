import { TouchableOpacity, View, Text, Animated, Dimensions } from 'react-native';
import { useEffect, useRef, useMemo } from 'react';
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
const RW_TERRACOTTA_DARK = '#A84020';
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
  const hasPlayed = useRef(false);

  useEffect(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

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

// Cutlery fan logo: spoon left, fork center-top, knife right — solid yellow, matches brand mark
function CutleryLogo({ size = 48 }: { size?: number }) {
  const iconSize = Math.round(size * 0.78);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Spoon — fanned left */}
      <MaterialCommunityIcons
        name="silverware-spoon"
        size={iconSize}
        color={RW_YELLOW}
        style={{ position: 'absolute', transform: [{ rotate: '-38deg' }], opacity: 0.92 }}
      />
      {/* Knife — fanned right */}
      <MaterialCommunityIcons
        name="silverware-variant"
        size={iconSize}
        color={RW_YELLOW}
        style={{ position: 'absolute', transform: [{ rotate: '38deg' }], opacity: 0.92 }}
      />
      {/* Fork — center, on top */}
      <MaterialCommunityIcons
        name="silverware-fork"
        size={iconSize}
        color={RW_YELLOW}
        style={{ position: 'absolute', zIndex: 2 }}
      />
    </View>
  );
}

function buildDateLabel(dates: string[]): string {
  if (!dates.length) return 'April 13–19 · Lancaster Dining Deals';
  return 'April 13–19 · Lancaster Dining Deals';
}

export default function RestaurantWeekBanner() {
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp>();
  const brand = getBrand();
  const shimmer = useRef(new Animated.Value(0)).current;

  const { data: partyEvent } = useQuery({
    queryKey: ['partyActiveEvent'],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data } = await supabase
        .from('party_events')
        .select('id, name, date, venue')
        .eq('is_active', true)
        .order('date', { ascending: true })
        .limit(1)
        .single();
      return data ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

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

  const dateLabel = useMemo(() => buildDateLabel(eventDates), [eventDates]);

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
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate('RestaurantWeek')}
        activeOpacity={0.85}
      >
        {/* Watermark utensils in background */}
        <Text style={styles.bgUtensil1}>🥄</Text>
        <Text style={styles.bgUtensil2}>🔪</Text>

        <View style={styles.content}>
          {/* Crossed utensils logo */}
          <CutleryLogo size={36} />

          <View style={styles.textGroup}>
            <Text style={styles.title}>Restaurant Week</Text>
            <Text style={styles.subtitle}>{dateLabel}</Text>
            <View style={styles.sponsorPill}>
              <Text style={styles.sponsorPillText}>Official Digital Sponsor</Text>
            </View>
          </View>

          <Animated.View style={[styles.arrow, {
            opacity: shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }),
          }]}>
            <Ionicons name="chevron-forward" size={22} color={RW_YELLOW} />
          </Animated.View>
        </View>

        {/* Party teaser strip — shown when a party event is active */}
        {partyEvent && (
          <TouchableOpacity
            style={styles.partyStrip}
            onPress={(e) => { e.stopPropagation?.(); navigation.navigate('PartyRSVP'); }}
            activeOpacity={0.8}
          >
            <Text style={styles.partyStripText}>🎉 Industry after-party · Apr 20 · Tap to RSVP →</Text>
          </TouchableOpacity>
        )}
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
    backgroundColor: RW_TERRACOTTA,       // terracotta background — matches the logo
    borderRadius: radius.lg,
    borderWidth: 0,
    padding: spacing.md,
    paddingHorizontal: spacing.md + 4,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  // Watermark utensils at low opacity
  bgUtensil1: {
    position: 'absolute',
    right: -8,
    top: -8,
    fontSize: 72,
    opacity: 0.12,
    transform: [{ rotate: '-30deg' }],
  },
  bgUtensil2: {
    position: 'absolute',
    left: -6,
    bottom: -8,
    fontSize: 56,
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
    gap: 3,
  },
  title: {
    fontSize: 18,
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
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  sponsorPillText: {
    fontSize: 8,
    fontWeight: '700',
    color: RW_YELLOW_DIM,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
