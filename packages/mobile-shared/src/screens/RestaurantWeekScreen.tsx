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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getSupabase, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { trackImpression } from '../lib/impressions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RW = {
  // Page background — deep warm terracotta-brown
  bgDark: '#2C0F06',
  // Cards match the banner exactly
  cardBg: '#C8532A',
  cardBorder: '#F0D060',
  cardBorderInner: 'rgba(240,208,96,0.2)',
  // Primary brand colors
  terracotta: '#C8532A',
  terracottaLight: '#D96B40',
  terracottaDark: '#A84020',
  terracottaMuted: 'rgba(200,83,42,0.4)',
  yellow: '#F0D060',
  yellowDim: 'rgba(240,208,96,0.75)',
  yellowMuted: 'rgba(240,208,96,0.45)',
  // Text — yellow on terracotta cards
  textPrimary: '#F0D060',
  textSecondary: 'rgba(240,208,96,0.75)',
  textMuted: 'rgba(240,208,96,0.45)',
  // Rules and decorations
  rule: 'rgba(240,208,96,0.3)',
  cornerDecor: 'rgba(240,208,96,0.5)',
};

interface HolidaySpecial {
  id: string;
  name: string;
  description: string | null;
  category: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  original_price: number | null;
  special_price: number | null;
  discount_description: string | null;
  image_url: string | null;
  restaurant: { id: string; name: string; cover_image_url: string | null; market_id: string; rw_description: string | null; description: string | null; custom_description: string | null };
}

interface RestaurantGroup {
  restaurantId: string;
  restaurantName: string;
  restaurantDescription: string | null;
  specials: HolidaySpecial[];
}

function CutleryLogo({ size = 48 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="silverware" size={Math.round(size * 0.9)} color="#F0D060" />
    </View>
  );
}

// --- Floating Fork Particles (background) ---
function ForkParticles() {
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
      emoji: Math.random() > 0.5 ? '🍴' : '🍽️',
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
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }} pointerEvents="none">
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

// --- Helpers ---
function formatEventDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (isNaN(day)) return 'April 13–19';
  const suffix = (n: number) => {
    if (n === 1 || n === 21 || n === 31) return 'st';
    if (n === 2 || n === 22) return 'nd';
    if (n === 3 || n === 23) return 'rd';
    return 'th';
  };
  const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1] || 'Apr';
  return `${monthName} ${day}${suffix(day)}`;
}

// --- Data fetching ---
async function fetchRestaurantWeekSpecials(marketSlug: string | null): Promise<HolidaySpecial[]> {
  const supabase = getSupabase();
  let marketId: string | null = null;
  if (marketSlug) {
    const { data: m } = await supabase.from('markets').select('id').eq('slug', marketSlug).single();
    marketId = m?.id || null;
  }
  let query = supabase
    .from('holiday_specials')
    .select('id,name,description,category,event_date,start_time,end_time,original_price,special_price,discount_description,image_url,restaurant:restaurants!inner(id,name,cover_image_url,market_id,rw_description,description,custom_description)')
    .eq('holiday_tag', 'restaurant-week-2026')
    .eq('is_active', true)
    .order('name');
  if (marketId) query = query.eq('restaurant.market_id', marketId);
  const { data, error } = await query;
  if (error) { console.warn('fetchRestaurantWeekSpecials:', error.message); return []; }
  return (data || []) as HolidaySpecial[];
}

// --- Smart special renderer ---
function SpecialDisplay({ name, description, styles }: {
  name: string;
  description: string | null;
  styles: any;
}) {
  const priceMatch = name.match(/^(\$\d+(?:\.\d{1,2})?)\s*(.*)/);
  const midMatch = !priceMatch ? name.match(/^(.*?)\s*(\$\d+(?:\.\d{1,2})?)\s*(.*)?/) : null;

  if (priceMatch) {
    const price = priceMatch[1];
    const rest = priceMatch[2];
    return (
      <View style={styles.specialBlock}>
        <View style={styles.dealRow}>
          <Text style={styles.priceHero}>{price}</Text>
          {rest ? <Text style={styles.dealName} numberOfLines={2}>{rest}</Text> : null}
        </View>
        {description && <Text style={styles.dealDesc}>{description}</Text>}
      </View>
    );
  }

  if (midMatch && midMatch[2]) {
    const before = midMatch[1].replace(/:?\s*$/, '');
    const price = midMatch[2];
    const after = midMatch[3] || '';
    const label = [before, after].filter(Boolean).join(' ');
    return (
      <View style={styles.specialBlock}>
        <View style={styles.dealRow}>
          <Text style={styles.priceHero}>{price}</Text>
          {label ? <Text style={styles.dealName} numberOfLines={2}>{label}</Text> : null}
        </View>
        {description && <Text style={styles.dealDesc}>{description}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.specialBlock}>
      <Text style={styles.dealNameLarge}>{name}</Text>
      {description && <Text style={styles.dealDesc}>{description}</Text>}
    </View>
  );
}

// --- Orange Rule Divider ---
function OrangeRule() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: RW.rule }} />
      <Text style={{ marginHorizontal: 8, fontSize: 10, color: RW.terracottaMuted }}>🥄✕🔪</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: RW.rule }} />
    </View>
  );
}

// --- Restaurant Card (flippable) ---
function RestaurantCard({ group, appName, onPress }: { group: RestaurantGroup; appName: string; onPress: () => void }) {
  const styles = useCardStyles();
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(1)).current;

  const dateLabel = 'April 13–19';

  const handleTap = useCallback(() => {
    // Squish to 0 (edge-on), swap face, expand back
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

      {/* Background forks */}
      <Text style={styles.bgFork1}>🍽️</Text>
      <Text style={styles.bgFork2}>🍴</Text>

      {/* Header: event label */}
      <View style={styles.eventRow}>
        <View style={styles.orangeLine} />
        <Text style={styles.eventLabel}>RESTAURANT WEEK 2026</Text>
        <View style={styles.orangeLine} />
      </View>

      {/* Restaurant name — hero text */}
      <Text style={styles.restaurantName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
        {group.restaurantName}
      </Text>

      <OrangeRule />

      {/* Specials */}
      {group.specials.map((special, idx) => (
        <View key={special.id}>
          {idx > 0 && <View style={styles.specialDivider} />}
          <SpecialDisplay
            name={special.name}
            description={special.description}
            styles={styles}
          />
        </View>
      ))}

      <OrangeRule />

      {/* Bottom branding */}
      <View style={styles.brandRow}>
        <Text style={styles.brandText}>{appName}</Text>
        <Text style={styles.brandDot}>&middot;</Text>
        <Text style={styles.brandText}>{dateLabel}</Text>
      </View>

      {/* Partnership badge */}
      <View style={styles.sponsorBadge}>
        <Text style={styles.sponsorText}>IN PARTNERSHIP WITH LCRW</Text>
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
      <Text style={styles.bgFork1}>🍽️</Text>
      <Text style={styles.bgFork2}>🍴</Text>

      {/* Header */}
      <View style={styles.eventRow}>
        <View style={styles.orangeLine} />
        <Text style={styles.eventLabel}>ABOUT</Text>
        <View style={styles.orangeLine} />
      </View>

      {/* Restaurant name */}
      <Text style={styles.restaurantName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
        {group.restaurantName}
      </Text>

      <OrangeRule />

      {/* Description */}
      <Text style={styles.backDescription}>
        {group.restaurantDescription || `${group.restaurantName} is proud to participate in Restaurant Week 2026. Tap "Explore" to view their full menu, hours, and more.`}
      </Text>

      <OrangeRule />

      {/* Actions */}
      <View style={styles.backActions}>
        <TouchableOpacity style={styles.backBtn} onPress={onPress}>
          <Text style={styles.backBtnText}>EXPLORE RESTAURANT ›</Text>
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
export default function RestaurantWeekScreen() {
  const styles = useStyles();
  const brand = getBrand();
  const navigation = useNavigation<NavigationProp>();
  const marketSlug = brand.marketSlug;

  const { data: specials = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['restaurantWeekSpecials', marketSlug],
    queryFn: () => fetchRestaurantWeekSpecials(marketSlug),
    staleTime: 2 * 60 * 1000,
  });

  const dateSubtitle = useMemo(() => {
    return `April 13–19, 2026 · ${brand.cityName} Dining`;
  }, [brand.cityName]);

  const restaurantGroups: RestaurantGroup[] = useMemo(() => {
    const map = new Map<string, RestaurantGroup>();
    for (const s of specials) {
      const existing = map.get(s.restaurant.id);
      if (existing) { existing.specials.push(s); }
      else { map.set(s.restaurant.id, { restaurantId: s.restaurant.id, restaurantName: s.restaurant.name, restaurantDescription: s.restaurant.rw_description || s.restaurant.custom_description || s.restaurant.description || null, specials: [s] }); }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.restaurantName.localeCompare(b.restaurantName)
    );
  }, [specials]);

  const handlePress = useCallback((id: string) => {
    navigation.navigate('RestaurantDetail', { id });
  }, [navigation]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const t of viewableItems) {
      const item = t.item as RestaurantGroup;
      if (item?.restaurantId) trackImpression(item.restaurantId, 'restaurant_week', t.index ?? 0);
    }
  }).current;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ForkParticles />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={RW.yellow} />
          <Text style={styles.loadingText}>Loading Restaurant Week...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ForkParticles />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={RW.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <CutleryLogo size={32} />
          <Text style={styles.headerTitle}>Restaurant Week</Text>
          <CutleryLogo size={32} />
        </View>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.headerSubtitle}>{dateSubtitle}</Text>

      <View style={styles.sponsorRow}>
        <Text style={styles.sponsorLabel}>IN PARTNERSHIP WITH LCRW</Text>
      </View>

      {/* Restaurant List */}
      <FlatList
        data={restaurantGroups}
        renderItem={({ item }) => (
          <RestaurantCard group={item} appName={brand.appName} onPress={() => handlePress(item.restaurantId)} />
        )}
        keyExtractor={item => item.restaurantId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={RW.yellow} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>Deals Coming Soon</Text>
            <Text style={styles.emptyText}>
              Restaurant Week runs April 13–19, 2026. Check back soon as participating restaurants add their special menus!
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
    backgroundColor: RW.cardBg,
    borderWidth: 2,
    borderColor: RW.cardBorder,
    borderRadius: 16,
    padding: 20,
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },

  cornerTL: { position: 'absolute', top: 4, left: 6, fontSize: 18, color: RW.cornerDecor, fontWeight: '300' },
  cornerTR: { position: 'absolute', top: 4, right: 6, fontSize: 18, color: RW.cornerDecor, fontWeight: '300' },
  cornerBL: { position: 'absolute', bottom: 4, left: 6, fontSize: 18, color: RW.cornerDecor, fontWeight: '300' },
  cornerBR: { position: 'absolute', bottom: 4, right: 6, fontSize: 18, color: RW.cornerDecor, fontWeight: '300' },

  bgFork1: { position: 'absolute', top: 20, right: 15, fontSize: 60, opacity: 0.04, transform: [{ rotate: '15deg' }] },
  bgFork2: { position: 'absolute', bottom: 15, left: 10, fontSize: 45, opacity: 0.03, transform: [{ rotate: '-25deg' }] },

  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orangeLine: {
    flex: 1,
    height: 1,
    backgroundColor: RW.rule,
  },
  eventLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: RW.yellowMuted,
    letterSpacing: 3,
    textAlign: 'center',
    marginHorizontal: 12,
  },

  restaurantName: {
    fontSize: 26,
    fontWeight: '900',
    color: RW.yellow,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 30,
    textTransform: 'uppercase',
  },

  specialBlock: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  specialDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    marginVertical: 2,
  },

  dealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  priceHero: {
    fontSize: 32,
    fontWeight: '900',
    color: RW.yellow,
    letterSpacing: -1,
    lineHeight: 36,
    textShadowColor: 'rgba(240,208,96,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  dealName: {
    fontSize: 18,
    fontWeight: '700',
    color: RW.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  dealNameLarge: {
    fontSize: 19,
    fontWeight: '800',
    color: RW.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  dealDesc: {
    fontSize: 11,
    color: RW.textMuted,
    textAlign: 'center',
    marginTop: 3,
    fontStyle: 'italic',
    letterSpacing: 0.3,
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
    color: RW.yellowMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandDot: {
    fontSize: 10,
    color: RW.yellowMuted,
  },

  sponsorBadge: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(240,208,96,0.4)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  sponsorText: {
    fontSize: 9,
    fontWeight: '700',
    color: RW.yellow,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  flipHint: {
    marginTop: 10,
    fontSize: 9,
    fontWeight: '600',
    color: RW.yellowMuted,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  // --- Back face ---
  cardBack: {
    backgroundColor: '#1A0C08',
    borderColor: RW.cardBorder,
  },

  backDescription: {
    fontSize: 14,
    color: RW.textSecondary,
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
    backgroundColor: RW.terracotta,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: RW.yellow,
  },

  backBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: RW.yellow,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
}));

// --- Screen-level Styles ---
const useStyles = createLazyStyles(() => ({
  container: { flex: 1, backgroundColor: RW.bgDark },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: RW.yellowDim, fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: RW.yellow, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: RW.yellowDim, textAlign: 'center', marginBottom: 6 },

  sponsorRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sponsorLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: RW.yellow,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    backgroundColor: 'rgba(200,83,42,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    overflow: 'hidden',
  },

  listContent: { padding: spacing.md, paddingTop: spacing.sm },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: RW.yellow },
  emptyText: { fontSize: 14, color: RW.yellowDim, textAlign: 'center', paddingHorizontal: 40 },
}));
