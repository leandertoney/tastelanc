import { useCallback, useMemo, useRef, useEffect } from 'react';
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
import { spacing, radius } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { trackImpression } from '../lib/impressions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ST = {
  bgDark: '#0D1F0D',
  posterBg: '#0F2B0F',
  posterBorder: '#D4AF37',
  posterBorderInner: 'rgba(212,175,55,0.25)',
  gold: '#D4AF37',
  goldLight: '#E8D48B',
  goldMuted: 'rgba(212,175,55,0.4)',
  shamrock: '#2ECC40',
  shamrockMuted: 'rgba(46,204,64,0.15)',
  textPrimary: '#E8F5E8',
  textSecondary: '#9CC49C',
  textMuted: '#5A8A5A',
  rule: 'rgba(212,175,55,0.3)',
  cornerDecor: 'rgba(212,175,55,0.5)',
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
  restaurant: { id: string; name: string; cover_image_url: string | null; market_id: string };
}

interface BarGroup {
  restaurantId: string;
  restaurantName: string;
  specials: HolidaySpecial[];
}

// --- Shamrock Particles (background) ---
function ShamrockParticles() {
  const { width, height } = Dimensions.get('window');
  const particles = useRef(
    Array.from({ length: 10 }).map(() => ({
      x: Math.random() * width,
      startY: -(Math.random() * 200 + 50),
      delay: Math.random() * 4000,
      duration: 7000 + Math.random() * 5000,
      size: 14 + Math.random() * 10,
      opacity: 0.06 + Math.random() * 0.08,
      anim: new Animated.Value(0),
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
        >☘</Animated.Text>
      ))}
    </View>
  );
}

// --- Helpers ---
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return minutes === '00' ? `${dh}${suffix}` : `${dh}:${minutes}${suffix}`;
}

function formatTimeRange(s: string | null, e: string | null): string {
  if (!s) return 'ALL DAY';
  return e ? `${formatTime(s)} – ${formatTime(e)}` : `${formatTime(s)}+`;
}

// --- Data fetching ---
async function fetchHolidaySpecials(marketSlug: string | null): Promise<HolidaySpecial[]> {
  const supabase = getSupabase();
  let marketId: string | null = null;
  if (marketSlug) {
    const { data: m } = await supabase.from('markets').select('id').eq('slug', marketSlug).single();
    marketId = m?.id || null;
  }
  let query = supabase
    .from('holiday_specials')
    .select('id,name,description,category,event_date,start_time,end_time,original_price,special_price,discount_description,image_url,restaurant:restaurants!inner(id,name,cover_image_url,market_id)')
    .eq('holiday_tag', 'st-patricks-2026')
    .eq('is_active', true)
    .order('name');
  if (marketId) query = query.eq('restaurant.market_id', marketId);
  const { data, error } = await query;
  if (error) { console.warn('fetchHolidaySpecials:', error.message); return []; }
  return (data || []) as HolidaySpecial[];
}

// --- Smart special renderer: price inline with deal for clear pairing ---
function SpecialDisplay({ name, description, styles }: {
  name: string;
  description: string | null;
  styles: any;
}) {
  // Try to extract a leading price like "$3", "$5.00", "$16.99"
  const priceMatch = name.match(/^(\$\d+(?:\.\d{1,2})?)\s*(.*)/);
  // Also try mid-string: "All pints $4" or "Drafts $5 all night"
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

  // No price found — just show the name prominently
  return (
    <View style={styles.specialBlock}>
      <Text style={styles.dealNameLarge}>{name}</Text>
      {description && <Text style={styles.dealDesc}>{description}</Text>}
    </View>
  );
}

// --- Gold Rule Divider ---
function GoldRule() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10, paddingHorizontal: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: ST.rule }} />
      <Text style={{ marginHorizontal: 8, fontSize: 10, color: ST.goldMuted }}>☘</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: ST.rule }} />
    </View>
  );
}

// Format event_date "2026-03-13" → "March 13th"
function formatEventDate(dateStr: string): string {
  const day = parseInt(dateStr.split('-')[2], 10);
  if (isNaN(day)) return 'March 17';
  const suffix = (n: number) => {
    if (n === 1 || n === 21 || n === 31) return 'st';
    if (n === 2 || n === 22) return 'nd';
    if (n === 3 || n === 23) return 'rd';
    return 'th';
  };
  return `March ${day}${suffix(day)}`;
}

// --- Poster Card ---
function PosterCard({ bar, appName, onPress }: { bar: BarGroup; appName: string; onPress: () => void }) {
  const styles = usePosterStyles();

  // Get the date(s) for this bar's specials
  const uniqueDates = Array.from(new Set(bar.specials.map(s => s.event_date))).sort();
  const dateLabel = uniqueDates.length === 1
    ? formatEventDate(uniqueDates[0])
    : `${formatEventDate(uniqueDates[0])}–${formatEventDate(uniqueDates[uniqueDates.length - 1]).replace('March ', '')}`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.posterOuter}>
      {/* Gold border frame */}
      <View style={styles.posterFrame}>
        {/* Corner decorations */}
        <Text style={styles.cornerTL}>╔</Text>
        <Text style={styles.cornerTR}>╗</Text>
        <Text style={styles.cornerBL}>╚</Text>
        <Text style={styles.cornerBR}>╝</Text>

        {/* Background shamrocks */}
        <Text style={styles.bgShamrock1}>☘</Text>
        <Text style={styles.bgShamrock2}>☘</Text>

        {/* Header: Holiday label */}
        <View style={styles.holidayRow}>
          <View style={styles.goldLine} />
          <Text style={styles.holidayLabel}>ST. PATRICK&apos;S DAY 2026</Text>
          <View style={styles.goldLine} />
        </View>

        {/* Bar name — hero text */}
        <Text style={styles.barName} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
          {bar.restaurantName}
        </Text>

        {/* Gold rule */}
        <GoldRule />

        {/* Specials */}
        {bar.specials.map((special, idx) => (
          <View key={special.id}>
            {idx > 0 && <View style={styles.specialDivider} />}
            <SpecialDisplay
              name={special.name}
              description={special.description}
              styles={styles}
            />
          </View>
        ))}

        {/* Bottom rule + branding */}
        <GoldRule />
        <View style={styles.brandRow}>
          <Text style={styles.brandText}>{appName}</Text>
          <Text style={styles.brandDot}>&middot;</Text>
          <Text style={styles.brandText}>{dateLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// --- Main Screen ---
export default function StPatricksDayScreen() {
  const styles = useStyles();
  const brand = getBrand();
  const navigation = useNavigation<NavigationProp>();
  const marketSlug = brand.marketSlug;
  const { data: specials = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['stPatricksSpecials', marketSlug],
    queryFn: () => fetchHolidaySpecials(marketSlug),
    staleTime: 2 * 60 * 1000,
  });

  // Build dynamic date subtitle from actual special dates
  const dateSubtitle = useMemo(() => {
    if (!specials.length) return `March 17 · ${brand.cityName} Bar Specials`;
    const days = Array.from(new Set(specials.map(s => {
      const parts = s.event_date.split('-');
      return parseInt(parts[2], 10);
    }))).filter(n => !isNaN(n)).sort((a, b) => a - b);
    if (!days.length) return `March 17 · ${brand.cityName} Bar Specials`;
    const suffix = (n: number) => {
      if (n === 1 || n === 21 || n === 31) return 'st';
      if (n === 2 || n === 22) return 'nd';
      if (n === 3 || n === 23) return 'rd';
      return 'th';
    };
    const first = days[0];
    const last = days[days.length - 1];
    const dateStr = first === last ? `March ${first}${suffix(first)}` : `March ${first}${suffix(first)}–${last}${suffix(last)}`;
    return `${dateStr} · ${brand.cityName} Bar Specials`;
  }, [specials, brand.cityName]);

  const barGroups: BarGroup[] = useMemo(() => {
    const map = new Map<string, BarGroup>();
    for (const s of specials) {
      const existing = map.get(s.restaurant.id);
      if (existing) { existing.specials.push(s); }
      else { map.set(s.restaurant.id, { restaurantId: s.restaurant.id, restaurantName: s.restaurant.name, specials: [s] }); }
    }
    // Sort by earliest event_date first, then by number of specials as tiebreaker
    return Array.from(map.values()).sort((a, b) => {
      const aDate = a.specials.reduce((min, s) => s.event_date < min ? s.event_date : min, a.specials[0].event_date);
      const bDate = b.specials.reduce((min, s) => s.event_date < min ? s.event_date : min, b.specials[0].event_date);
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return b.specials.length - a.specials.length;
    });
  }, [specials]);

  const handlePress = useCallback((id: string) => {
    navigation.navigate('RestaurantDetail', { id });
  }, [navigation]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const t of viewableItems) {
      const item = t.item as BarGroup;
      if (item?.restaurantId) trackImpression(item.restaurantId, 'st_patricks_day', t.index ?? 0);
    }
  }).current;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ShamrockParticles />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={ST.shamrock} />
          <Text style={styles.loadingText}>Loading the luck...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ShamrockParticles />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={ST.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>☘</Text>
          <Text style={styles.headerTitle}>St. Patrick&apos;s Day</Text>
          <Text style={styles.headerEmoji}>☘</Text>
        </View>
        <View style={styles.backButton} />
      </View>

      <Text style={styles.headerSubtitle}>
        {dateSubtitle}
      </Text>

      {/* Poster List */}
      <FlatList
        data={barGroups}
        renderItem={({ item }) => (
          <PosterCard bar={item} appName={brand.appName} onPress={() => handlePress(item.restaurantId)} />
        )}
        keyExtractor={item => item.restaurantId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ST.shamrock} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>☘</Text>
            <Text style={styles.emptyTitle}>No Specials Yet</Text>
            <Text style={styles.emptyText}>Check back soon — bars are still adding their St. Patrick&apos;s Day deals!</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// --- Poster Card Styles ---
const usePosterStyles = createLazyStyles(() => ({
  posterOuter: {
    marginBottom: 20,
  },
  posterFrame: {
    backgroundColor: ST.posterBg,
    borderWidth: 2,
    borderColor: ST.posterBorder,
    borderRadius: 16,
    padding: 20,
    paddingVertical: 24,
    position: 'relative',
    overflow: 'hidden',
    // Inner border effect via shadow
    shadowColor: ST.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  // Corner decorations
  cornerTL: { position: 'absolute', top: 4, left: 6, fontSize: 18, color: ST.cornerDecor, fontWeight: '300' },
  cornerTR: { position: 'absolute', top: 4, right: 6, fontSize: 18, color: ST.cornerDecor, fontWeight: '300' },
  cornerBL: { position: 'absolute', bottom: 4, left: 6, fontSize: 18, color: ST.cornerDecor, fontWeight: '300' },
  cornerBR: { position: 'absolute', bottom: 4, right: 6, fontSize: 18, color: ST.cornerDecor, fontWeight: '300' },

  // Background shamrocks
  bgShamrock1: { position: 'absolute', top: 20, right: 15, fontSize: 60, opacity: 0.04, transform: [{ rotate: '15deg' }] },
  bgShamrock2: { position: 'absolute', bottom: 15, left: 10, fontSize: 45, opacity: 0.03, transform: [{ rotate: '-25deg' }] },

  // Holiday label row
  holidayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: ST.rule,
  },
  holidayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: ST.goldMuted,
    letterSpacing: 3,
    textAlign: 'center',
    marginHorizontal: 12,
  },

  // Bar name — poster hero
  barName: {
    fontSize: 26,
    fontWeight: '900',
    color: ST.gold,
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: 30,
    textTransform: 'uppercase',
  },

  // Special block
  specialBlock: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  specialDivider: {
    height: 1,
    backgroundColor: 'rgba(46,204,64,0.12)',
    marginVertical: 2,
  },

  // Inline row: price + deal name side by side
  dealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  // Price — big gold, inline with the deal
  priceHero: {
    fontSize: 32,
    fontWeight: '900',
    color: ST.gold,
    letterSpacing: -1,
    lineHeight: 36,
    textShadowColor: 'rgba(212,175,55,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Deal name — sits right next to the price
  dealName: {
    fontSize: 18,
    fontWeight: '700',
    color: ST.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  // Deal name when there's no price to extract — centered larger
  dealNameLarge: {
    fontSize: 19,
    fontWeight: '800',
    color: ST.textPrimary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Description — quiet supporting text
  dealDesc: {
    fontSize: 11,
    color: ST.textMuted,
    textAlign: 'center',
    marginTop: 3,
    fontStyle: 'italic',
    letterSpacing: 0.3,
  },

  // Brand watermark
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 10,
    fontWeight: '600',
    color: ST.goldMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandDot: {
    fontSize: 10,
    color: ST.goldMuted,
  },
}));

// --- Screen-level Styles ---
const useStyles = createLazyStyles(() => ({
  container: { flex: 1, backgroundColor: ST.bgDark },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: ST.textSecondary, fontWeight: '500' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerEmoji: { fontSize: 22 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: ST.textPrimary, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 14, color: ST.textSecondary, textAlign: 'center', marginBottom: spacing.md },

  listContent: { padding: spacing.md, paddingTop: spacing.sm },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyEmoji: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: ST.textPrimary },
  emptyText: { fontSize: 14, color: ST.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
}));
