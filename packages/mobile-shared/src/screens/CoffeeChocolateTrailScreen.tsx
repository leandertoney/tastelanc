import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getSupabase, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing } from '../constants/spacing';
import { trackImpression } from '../lib/impressions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CCT = {
  bgDark:          '#2A0D40',
  cardBg:          '#5E2077',
  cardBorder:      '#D4AF37',
  cardBorderInner: 'rgba(212,175,55,0.2)',
  purple:          '#5E2077',
  purpleLight:     '#7A2E9A',
  purpleDark:      '#3D1450',
  purpleMuted:     'rgba(94,32,119,0.4)',
  gold:            '#D4AF37',
  goldDim:         'rgba(212,175,55,0.75)',
  goldMuted:       'rgba(212,175,55,0.45)',
  textPrimary:     '#D4AF37',
  textSecondary:   'rgba(212,175,55,0.75)',
  textMuted:       'rgba(212,175,55,0.45)',
  rule:            'rgba(212,175,55,0.3)',
  cornerDecor:     'rgba(212,175,55,0.5)',
};

interface TrailStop {
  id: string;
  name: string;
  description: string | null;
  event_date: string;
  restaurant: {
    id: string;
    name: string;
    cover_image_url: string | null;
    market_id: string;
    description: string | null;
    custom_description: string | null;
  };
}

interface TrailStopGroup {
  restaurantId: string;
  restaurantName: string;
  restaurantDescription: string | null;
  stop: TrailStop;
}

// --- Floating Particle Background ---
function CoffeeParticles() {
  const { width, height } = Dimensions.get('window');
  const particles = useRef(
    Array.from({ length: 10 }).map(() => ({
      x: Math.random() * width,
      startY: -(Math.random() * 200 + 50),
      delay: Math.random() * 4000,
      duration: 7000 + Math.random() * 5000,
      size: 14 + Math.random() * 10,
      opacity: 0.05 + Math.random() * 0.07,
      anim: new Animated.Value(0),
      emoji: ['☕', '🍫', '☕', '🍬', '✨'][Math.floor(Math.random() * 5)],
    }))
  ).current;

  useEffect(() => {
    particles.forEach(p => {
      const animate = () => {
        p.anim.setValue(0);
        Animated.timing(p.anim, {
          toValue: 1,
          duration: p.duration,
          delay: p.delay,
          useNativeDriver: true,
        }).start(() => { p.delay = 0; animate(); });
      };
      animate();
    });
  }, [particles]);

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
      pointerEvents="none"
    >
      {particles.map((p, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute', left: p.x, fontSize: p.size, opacity: p.opacity,
            transform: [
              { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [p.startY, height + 50] }) },
              { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            ],
          }}
        >
          {p.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

// --- Gold Rule Divider ---
function GoldRule() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: CCT.rule }} />
      <Text style={{ marginHorizontal: 8, fontSize: 10, color: CCT.purpleMuted }}>☕✕🍫</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: CCT.rule }} />
    </View>
  );
}

// --- Data fetching ---
async function fetchTrailStops(marketSlug: string | null): Promise<TrailStop[]> {
  const supabase = getSupabase();
  let marketId: string | null = null;
  if (marketSlug) {
    const { data: m } = await supabase.from('markets').select('id').eq('slug', marketSlug).single();
    marketId = m?.id || null;
  }
  let query = supabase
    .from('holiday_specials')
    .select('id,name,description,event_date,restaurant:restaurants!inner(id,name,cover_image_url,market_id,description,custom_description)')
    .eq('holiday_tag', 'coffee-chocolate-trail-2026')
    .eq('is_active', true)
    .order('name');
  if (marketId) query = query.eq('restaurant.market_id', marketId);
  const { data, error } = await query;
  if (error) { console.warn('fetchTrailStops:', error.message); return []; }
  return (data || []) as TrailStop[];
}

// --- Trail Stop Card (flippable) ---
function TrailStopCard({ group, onPress }: { group: TrailStopGroup; onPress: () => void }) {
  const styles = useCardStyles();
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(1)).current;

  const handleTap = useCallback(() => {
    Animated.timing(flipAnim, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setIsFlipped(v => !v);
      Animated.timing(flipAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  }, [flipAnim]);

  const FrontFace = (
    <View style={styles.cardFrame}>
      {/* Corner decorations */}
      <Text style={styles.cornerTL}>╔</Text>
      <Text style={styles.cornerTR}>╗</Text>
      <Text style={styles.cornerBL}>╚</Text>
      <Text style={styles.cornerBR}>╝</Text>

      {/* Background watermark emojis */}
      <Text style={styles.bgEmoji1}>☕</Text>
      <Text style={styles.bgEmoji2}>🍫</Text>

      {/* Header: trail label */}
      <View style={styles.eventRow}>
        <View style={styles.goldLine} />
        <Text style={styles.eventLabel}>COFFEE & CHOCOLATE TRAIL 2026</Text>
        <View style={styles.goldLine} />
      </View>

      {/* Restaurant name — hero text */}
      <Text style={styles.restaurantName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
        {group.restaurantName}
      </Text>

      <GoldRule />

      {/* Trail stop description teaser */}
      <Text style={styles.teaser} numberOfLines={3}>
        {group.restaurantDescription
          ? group.restaurantDescription.replace(/\s+is an official stop.*/, '').trim()
          : 'Official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail.'}
      </Text>

      <GoldRule />

      {/* Bottom branding */}
      <View style={styles.brandRow}>
        <Text style={styles.brandText}>TasteCumberland</Text>
        <Text style={styles.brandDot}>&middot;</Text>
        <Text style={styles.brandText}>Jan 28–May 11</Text>
      </View>

      {/* Trail badge */}
      <View style={styles.trailBadge}>
        <Text style={styles.trailBadgeText}>OFFICIAL TRAIL STOP</Text>
      </View>

      {/* Flip hint */}
      <Text style={styles.flipHint}>TAP TO LEARN MORE ›</Text>
    </View>
  );

  const BackFace = (
    <View style={[styles.cardFrame, styles.cardBack]}>
      {/* Corner decorations */}
      <Text style={styles.cornerTL}>╔</Text>
      <Text style={styles.cornerTR}>╗</Text>
      <Text style={styles.cornerBL}>╚</Text>
      <Text style={styles.cornerBR}>╝</Text>

      {/* Background watermark */}
      <Text style={styles.bgEmoji1}>☕</Text>
      <Text style={styles.bgEmoji2}>🍫</Text>

      {/* Header */}
      <View style={styles.eventRow}>
        <View style={styles.goldLine} />
        <Text style={styles.eventLabel}>ABOUT</Text>
        <View style={styles.goldLine} />
      </View>

      {/* Restaurant name */}
      <Text style={styles.restaurantName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
        {group.restaurantName}
      </Text>

      <GoldRule />

      {/* Full description */}
      <Text style={styles.backDescription}>
        {group.restaurantDescription ||
          `${group.restaurantName} is an official stop on the 2026 Cumberland Valley Coffee & Chocolate Trail. Tap "Explore" to view their full details.`}
      </Text>

      <GoldRule />

      {/* Action button */}
      <View style={styles.backActions}>
        <TouchableOpacity style={styles.backBtn} onPress={onPress}>
          <Text style={styles.backBtnText}>EXPLORE STOP ›</Text>
        </TouchableOpacity>
      </View>

      {/* Flip back hint */}
      <Text style={styles.flipHint}>TAP CARD TO FLIP BACK ‹</Text>
    </View>
  );

  return (
    <TouchableOpacity onPress={handleTap} activeOpacity={0.88} style={styles.cardOuter}>
      <Animated.View style={{ transform: [{ scaleX: flipAnim }] }}>
        {isFlipped ? BackFace : FrontFace}
      </Animated.View>
    </TouchableOpacity>
  );
}

// --- Main Screen ---
export default function CoffeeChocolateTrailScreen() {
  const styles = useStyles();
  const brand = getBrand();
  const navigation = useNavigation<NavigationProp>();
  const marketSlug = brand.marketSlug;

  const { data: stops = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['coffeeChocolateTrailStops', marketSlug],
    queryFn: () => fetchTrailStops(marketSlug),
    staleTime: 2 * 60 * 1000,
  });

  const trailGroups: TrailStopGroup[] = useMemo(() => {
    const map = new Map<string, TrailStopGroup>();
    for (const s of stops) {
      if (!map.has(s.restaurant.id)) {
        map.set(s.restaurant.id, {
          restaurantId: s.restaurant.id,
          restaurantName: s.restaurant.name,
          restaurantDescription:
            s.description ||
            s.restaurant.custom_description ||
            s.restaurant.description ||
            null,
          stop: s,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.restaurantName.localeCompare(b.restaurantName)
    );
  }, [stops]);

  const handlePress = useCallback((id: string) => {
    navigation.navigate('RestaurantDetail', { id });
  }, [navigation]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const t of viewableItems) {
      const item = t.item as TrailStopGroup;
      if (item?.restaurantId) trackImpression(item.restaurantId, 'coffee_chocolate_trail', t.index ?? 0);
    }
  }).current;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <CoffeeParticles />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={CCT.gold} />
          <Text style={styles.loadingText}>Loading Trail Stops...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <CoffeeParticles />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={CCT.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>☕</Text>
          <Text style={styles.headerTitle}>Coffee & Chocolate Trail</Text>
          <Text style={styles.headerEmoji}>🍫</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.headerSubtitle}>Jan 28–May 11, 2026 · Cumberland Valley</Text>

      <View style={styles.stopCountRow}>
        <Text style={styles.stopCountLabel}>{trailGroups.length} OFFICIAL STOPS</Text>
      </View>

      {/* Trail Stop List */}
      <FlatList
        data={trailGroups}
        renderItem={({ item }) => (
          <TrailStopCard
            group={item}
            onPress={() => handlePress(item.restaurantId)}
          />
        )}
        keyExtractor={item => item.restaurantId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={CCT.gold} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>☕</Text>
            <Text style={styles.emptyTitle}>Trail Stops Loading</Text>
            <Text style={styles.emptyText}>
              The Cumberland Valley Coffee & Chocolate Trail runs January 28–May 11, 2026. Check back soon!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// --- Card Styles ---
const useCardStyles = createLazyStyles(() => ({
  cardOuter: {
    marginBottom: 20,
  },
  cardFrame: {
    backgroundColor: CCT.cardBg,
    borderWidth: 2,
    borderColor: CCT.cardBorder,
    borderRadius: 16,
    padding: 20,
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  cornerTL: { position: 'absolute', top: 4, left: 6, fontSize: 18, color: CCT.cornerDecor, fontWeight: '300' },
  cornerTR: { position: 'absolute', top: 4, right: 6, fontSize: 18, color: CCT.cornerDecor, fontWeight: '300' },
  cornerBL: { position: 'absolute', bottom: 4, left: 6, fontSize: 18, color: CCT.cornerDecor, fontWeight: '300' },
  cornerBR: { position: 'absolute', bottom: 4, right: 6, fontSize: 18, color: CCT.cornerDecor, fontWeight: '300' },

  bgEmoji1: { position: 'absolute', top: 20, right: 15, fontSize: 60, opacity: 0.05, transform: [{ rotate: '15deg' }] },
  bgEmoji2: { position: 'absolute', bottom: 15, left: 10, fontSize: 45, opacity: 0.04, transform: [{ rotate: '-25deg' }] },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: CCT.rule,
  },
  eventLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: CCT.goldMuted,
    letterSpacing: 2.5,
    textAlign: 'center',
    marginHorizontal: 10,
  },

  restaurantName: {
    fontSize: 26,
    fontWeight: '900',
    color: CCT.gold,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 30,
    textTransform: 'uppercase',
  },

  teaser: {
    fontSize: 13,
    color: CCT.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '600',
    color: CCT.goldMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandDot: {
    fontSize: 10,
    color: CCT.goldMuted,
  },

  trailBadge: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(212,175,55,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  trailBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: CCT.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  flipHint: {
    marginTop: 10,
    fontSize: 9,
    fontWeight: '600',
    color: CCT.goldMuted,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // Back face
  cardBack: {
    backgroundColor: '#1A0A2E',
    borderColor: CCT.cardBorder,
  },

  backDescription: {
    fontSize: 14,
    color: CCT.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    fontStyle: 'italic',
  },

  backActions: {
    marginTop: 4,
    alignItems: 'center',
  },

  backBtn: {
    backgroundColor: CCT.purple,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: CCT.gold,
  },

  backBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: CCT.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
}));

// --- Screen-level Styles ---
const useStyles = createLazyStyles(() => ({
  container: { flex: 1, backgroundColor: CCT.bgDark },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: CCT.goldDim, fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerEmoji: { fontSize: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: CCT.gold, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: CCT.goldDim, textAlign: 'center', marginBottom: 6 },

  stopCountRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stopCountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: CCT.gold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    backgroundColor: 'rgba(94,32,119,0.5)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },

  listContent: { padding: spacing.md, paddingTop: spacing.sm },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: CCT.gold },
  emptyText: { fontSize: 14, color: CCT.goldDim, textAlign: 'center', paddingHorizontal: 40 },
}));
