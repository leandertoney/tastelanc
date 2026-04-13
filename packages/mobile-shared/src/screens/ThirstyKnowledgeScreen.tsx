/**
 * ThirstyKnowledgeScreen — Partner hub for Thirsty for Knowledge Trivia
 *
 * Full-screen hub showing the weekly TFK event schedule and leaderboard.
 * Visual style pays homage to TFK's own Facebook schedule posts:
 *   - Pastel tie-dye gradient background (pink → purple → blue)
 *   - Large bold purple day headings
 *   - Dark navy rounded cards for each category's venue list
 *   - TFK logo in the header
 *
 * Lancaster market only — returns null for other markets.
 * Entry point: ThirstyKnowledgeCard on HomeScreen (and navigate('ThirstyKnowledge') from anywhere).
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { ApiEvent } from '../lib/events';
import { fetchEvents } from '../lib/events';
import { getBrand, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius, typography } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';

// ─────────────────────────────────────────────────────────────────────────────
// Brand palette — fixed TFK colors regardless of user theme
// ─────────────────────────────────────────────────────────────────────────────
const TFK = {
  bgGradient: ['#F9A8D4', '#C084FC', '#93C5FD'] as const,
  bgGradientLocations: [0, 0.5, 1] as const,
  cardBg: '#1A2A4A',
  cardBorder: 'rgba(201,168,76,0.3)',
  headingPurple: '#6D28D9',
  headingPink: '#DB2777',
  categoryColor: '#BE185D',
  textWhite: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textNavy: '#1A2A4A',
  gold: '#D97706',
  goldLight: '#FCD34D',
  winnerBg: 'rgba(252,211,77,0.15)',
  winnerBorder: '#D97706',
  campaignBg: 'rgba(26,42,74,0.92)',
  campaignBorder: '#D97706',
  divider: 'rgba(255,255,255,0.2)',
  rowDivider: 'rgba(255,255,255,0.1)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Phantom restaurant ID used for franchise/unlinkable venues
// ─────────────────────────────────────────────────────────────────────────────
const PHANTOM_ID = '00000000-0000-0000-0000-000000000001';

// ─────────────────────────────────────────────────────────────────────────────
// Restaurant Week campaign window
// ─────────────────────────────────────────────────────────────────────────────
const RW_START = new Date('2026-04-13T00:00:00');
const RW_END = new Date('2026-04-19T23:59:59');

function isRestaurantWeekActive(): boolean {
  const now = new Date();
  return now >= RW_START && now <= RW_END;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schedule grouping
// ─────────────────────────────────────────────────────────────────────────────
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

// Within a day, group by event type in this order
const CATEGORY_ORDER = ['trivia', 'music_bingo', 'karaoke'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  trivia: 'Trivia',
  music_bingo: 'Music Bingo',
  karaoke: 'Karaoke',
};
// Events with this name prefix get a "Music Trivia" sub-label
const MUSIC_TRIVIA_NAME = 'Music Trivia';

interface CategorySection {
  type: string;
  label: string;
  events: ApiEvent[];
}

interface DaySection {
  day: string;
  displayTitle: string;
  categories: CategorySection[];
}

function groupByDayAndCategory(events: ApiEvent[]): DaySection[] {
  // Build a map: day → type → events[]
  const map: Record<string, Record<string, ApiEvent[]>> = {};
  for (const event of events) {
    for (const day of event.days_of_week) {
      if (!map[day]) map[day] = {};
      const type = event.event_type as string;
      if (!map[day][type]) map[day][type] = [];
      map[day][type].push(event);
    }
  }

  return DAY_ORDER
    .filter((day) => map[day] && Object.keys(map[day]).length > 0)
    .map((day) => {
      const categories: CategorySection[] = CATEGORY_ORDER
        .filter((type) => map[day]?.[type]?.length > 0)
        .map((type) => ({
          type,
          label: CATEGORY_LABELS[type] ?? type,
          events: (map[day][type] ?? []).sort((a, b) =>
            (a.start_time || '').localeCompare(b.start_time || '')
          ),
        }));

      return {
        day,
        displayTitle: DAY_LABELS[day] ?? day,
        categories,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard types
// ─────────────────────────────────────────────────────────────────────────────
interface LeaderboardEntry {
  id: string;
  player_name: string;
  score: number;
  venue_name: string;
  position: number;
  is_winner: boolean;
  prize_description: string | null;
  week_start: string;
  nightly_date: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

function isLinkedVenue(event: ApiEvent): boolean {
  return !!event.restaurant?.id && event.restaurant.id !== PHANTOM_ID;
}

// Example standings shown before real data arrives — clearly labeled as demo
const DEMO_ENTRIES: LeaderboardEntry[] = [
  { id: 'd1', position: 1, player_name: 'The Quizard of Oz', venue_name: "Bube's Brewery", score: 487, is_winner: false, prize_description: null, week_start: '', nightly_date: null },
  { id: 'd2', position: 2, player_name: 'Trivia Newton John', venue_name: 'The Pressroom', score: 461, is_winner: false, prize_description: null, week_start: '', nightly_date: null },
  { id: 'd3', position: 3, player_name: 'Let Me Google That', venue_name: 'Federal Taphouse', score: 438, is_winner: false, prize_description: null, week_start: '', nightly_date: null },
  { id: 'd4', position: 4, player_name: 'Quiz Khalifa', venue_name: 'Decades', score: 412, is_winner: false, prize_description: null, week_start: '', nightly_date: null },
];

function getTodayDayKey(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
}

function getMedalIcon(position: number): string {
  if (position === 1) return '🥇';
  if (position === 2) return '🥈';
  if (position === 3) return '🥉';
  return `${position}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CampaignBanner() {
  const styles = useStyles();
  return (
    <View style={styles.campaignBanner}>
      <View style={styles.campaignRow}>
        <Ionicons name="trophy-outline" size={20} color={TFK.goldLight} />
        <Text style={styles.campaignTitle}>We're Sponsoring the Picture Round!</Text>
      </View>
      <Text style={styles.campaignBody}>
        TasteLanc is proud to sponsor the Picture Round at Thirsty for Knowledge trivia during
        Restaurant Week. Plus, one winning team each night wins $25 — announced and claimed in the app!
      </Text>
    </View>
  );
}

function TFKVenueRow({
  event,
  onPress,
  isLast,
}: {
  event: ApiEvent;
  onPress?: () => void;
  isLast: boolean;
}) {
  const styles = useStyles();
  const linked = isLinkedVenue(event);
  const isMusicTrivia = event.name.startsWith(MUSIC_TRIVIA_NAME);

  const content = (
    <View style={[styles.venueRow, !isLast && styles.venueRowDivider]}>
      <View style={styles.venueRowLeft}>
        <Text style={styles.venueNameText} numberOfLines={1}>
          {event.performer_name || event.name}
          {isMusicTrivia ? '  · Music Trivia' : ''}
        </Text>
        <Text style={styles.venueTimeText}>{formatTime(event.start_time)}</Text>
      </View>
      {linked && (
        <Ionicons name="chevron-forward" size={16} color={TFK.textMuted} />
      )}
    </View>
  );

  if (linked && onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function LeaderboardSection({
  entries,
  marketId,
}: {
  entries: LeaderboardEntry[];
  marketId: string | null;
}) {
  const [tab, setTab] = useState<'overall' | 'nightly'>('overall');
  const styles = useStyles();

  const overallEntries = useMemo(
    () => entries.filter((e) => e.nightly_date === null).slice(0, 10),
    [entries]
  );
  const nightlyEntries = useMemo(
    () => entries.filter((e) => e.nightly_date !== null).slice(0, 20),
    [entries]
  );

  const displayed = tab === 'overall' ? overallEntries : nightlyEntries;

  return (
    <View style={styles.leaderboardSection}>
      {/* Header */}
      <View style={styles.leaderboardHeader}>
        <Ionicons name="trophy" size={22} color={TFK.goldLight} />
        <View style={styles.leaderboardHeaderText}>
          <Text style={styles.leaderboardTitle}>Restaurant Week Leaderboard</Text>
          <Text style={styles.leaderboardSubtitle}>$25 Nightly Prizes · April 13–19</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'overall' && styles.tabActive]}
          onPress={() => setTab('overall')}
        >
          <Text style={[styles.tabText, tab === 'overall' && styles.tabTextActive]}>Overall</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'nightly' && styles.tabActive]}
          onPress={() => setTab('nightly')}
        >
          <Text style={[styles.tabText, tab === 'nightly' && styles.tabTextActive]}>Nightly</Text>
        </TouchableOpacity>
      </View>

      {/* Example label — only shown when no real data yet */}
      {displayed.length === 0 && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>EXAMPLE · Live standings begin April 13</Text>
        </View>
      )}

      {/* Entries — show real data when available, demo placeholders when empty */}
      {(displayed.length > 0 ? displayed : DEMO_ENTRIES).map((entry: LeaderboardEntry, idx: number, arr: LeaderboardEntry[]) => (
        <View
          key={entry.id}
          style={[
            styles.leaderboardRow,
            entry.is_winner && styles.leaderboardRowWinner,
            idx < arr.length - 1 && styles.leaderboardRowDivider,
            displayed.length === 0 && styles.leaderboardRowDemo,
          ]}
        >
          <Text style={styles.leaderboardMedal}>{getMedalIcon(entry.position)}</Text>
          <View style={styles.leaderboardRowBody}>
            <Text style={[styles.leaderboardPlayerName, entry.is_winner && styles.leaderboardWinnerText]}>
              {entry.player_name}
              {entry.is_winner ? '  🏆' : ''}
            </Text>
            <Text style={styles.leaderboardVenue}>{entry.venue_name}</Text>
            {entry.prize_description ? (
              <Text style={styles.leaderboardPrize}>{entry.prize_description}</Text>
            ) : null}
          </View>
          <Text style={[styles.leaderboardScore, entry.is_winner && styles.leaderboardWinnerText]}>
            {entry.score} pts
          </Text>
        </View>
      ))}

      {displayed.length === 0 && (
        <Text style={styles.leaderboardDemoNote}>
          Standings update nightly starting April 13
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ThirstyKnowledgeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const brand = getBrand();
  const styles = useStyles();

  // Lancaster-only guard
  if (brand.marketSlug !== 'lancaster-pa') return null;

  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch TFK events ──────────────────────────────────────────────
  const {
    data: events = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: ['tfk-events', marketId],
    queryFn: () =>
      fetchEvents({
        partner_slug: 'thirsty-for-knowledge',
        market_id: marketId,
        limit: 150,
        paid_only: false,
      }),
    staleTime: 10 * 60 * 1000,
  });

  // ── Fetch leaderboard ─────────────────────────────────────────────
  const {
    data: leaderboard = [],
    refetch: refetchLeaderboard,
  } = useQuery({
    queryKey: ['tfk-leaderboard', marketId],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const supabase = getSupabase();
      let query = supabase
        .from('trivia_leaderboard_entries')
        .select('*')
        .eq('is_active', true)
        .order('week_start', { ascending: false })
        .order('position', { ascending: true })
        .limit(50);
      if (marketId) {
        query = query.eq('market_id', marketId);
      }
      const { data } = await query;
      return (data as LeaderboardEntry[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const daySections = useMemo(() => groupByDayAndCategory(events), [events]);

  // ── Collapsible day sections ──────────────────────────────────────
  const todayKey = getTodayDayKey();
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set([todayKey])
  );
  // One Animated.Value per day — 0 = collapsed (chevron right), 1 = expanded (chevron down)
  const chevronAnims = useRef<Record<string, Animated.Value>>(
    Object.fromEntries(
      DAY_ORDER.map((day) => [day, new Animated.Value(day === todayKey ? 1 : 0)])
    )
  ).current;

  const toggleDay = useCallback((day: string) => {
    const isCurrentlyExpanded = expandedDays.has(day);
    setExpandedDays((prev) => {
      const next = new Set(prev);
      isCurrentlyExpanded ? next.delete(day) : next.add(day);
      return next;
    });
    Animated.timing(chevronAnims[day], {
      toValue: isCurrentlyExpanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expandedDays, chevronAnims]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchEvents(), refetchLeaderboard()]);
    setRefreshing(false);
  }, [refetchEvents, refetchLeaderboard]);

  const rwActive = isRestaurantWeekActive();

  return (
    <LinearGradient
      colors={TFK.bgGradient}
      locations={TFK.bgGradientLocations}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* ── Custom Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={26} color={TFK.textNavy} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Thirsty for Knowledge</Text>
            <Text style={styles.headerSubtitle}>Bar Trivia · Lancaster, PA</Text>
          </View>

          <View style={styles.logoCircle}>
            <Image
              source={{ uri: 'https://kufcxxynjvyharhtfptd.supabase.co/storage/v1/object/public/images/ads/tfk_logo.png' }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={TFK.headingPurple}
            />
          }
        >
          {/* ── Campaign Banner (Restaurant Week only) ── */}
          {rwActive && <CampaignBanner />}

          {/* ── Weekly Schedule ── */}
          <Text style={styles.sectionLabel}>WEEKLY SCHEDULE</Text>

          {eventsLoading ? (
            <ActivityIndicator color={TFK.headingPurple} size="large" style={{ marginVertical: 40 }} />
          ) : daySections.length === 0 ? (
            <View style={styles.emptySchedule}>
              <Text style={styles.emptyText}>Schedule loading — check back soon!</Text>
            </View>
          ) : (
            daySections.map((daySection) => {
              const isExpanded = expandedDays.has(daySection.day);
              const chevronRotation = chevronAnims[daySection.day].interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '90deg'],
              });
              return (
                <View key={daySection.day} style={styles.dayBlock}>
                  {/* Tappable day heading row */}
                  <TouchableOpacity
                    style={styles.dayHeadingRow}
                    onPress={() => toggleDay(daySection.day)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
                  >
                    <Text style={styles.dayHeading}>{daySection.displayTitle}</Text>
                    <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
                      <Ionicons name="chevron-forward" size={24} color={TFK.headingPurple} />
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Collapsible content */}
                  {isExpanded && daySection.categories.map((cat) => (
                    <View key={cat.type} style={styles.categoryBlock}>
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                      <View style={styles.venueCard}>
                        {cat.events.map((event, idx) => (
                          <TFKVenueRow
                            key={event.id}
                            event={event}
                            isLast={idx === cat.events.length - 1}
                            onPress={
                              isLinkedVenue(event)
                                ? () => navigation.navigate('EventDetail', { event })
                                : undefined
                            }
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              );
            })
          )}

          {/* ── Leaderboard ── */}
          <LeaderboardSection entries={leaderboard} marketId={marketId} />

          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles — all use TFK.* constants; no colors.* from theme (fixed brand palette)
// ─────────────────────────────────────────────────────────────────────────────
const useStyles = createLazyStyles(() => ({
  gradient: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: typography.headline,
    fontWeight: '800' as const,
    color: TFK.textNavy,
    textAlign: 'center' as const,
  },
  headerSubtitle: {
    fontSize: typography.footnote,
    color: TFK.textNavy,
    opacity: 0.7,
    textAlign: 'center' as const,
  },
  logoCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    overflow: 'hidden' as const,
    borderWidth: 2,
    borderColor: TFK.goldLight,
  },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },

  // Campaign Banner
  campaignBanner: {
    backgroundColor: TFK.campaignBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: TFK.campaignBorder,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  campaignRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  campaignTitle: {
    fontSize: typography.callout,
    fontWeight: '700' as const,
    color: TFK.goldLight,
    flex: 1,
  },
  campaignBody: {
    fontSize: typography.footnote,
    color: TFK.textMuted,
    lineHeight: 18,
  },

  // Section label
  sectionLabel: {
    fontSize: typography.caption1,
    fontWeight: '700' as const,
    color: TFK.textNavy,
    letterSpacing: 1.5,
    opacity: 0.8,
    marginTop: spacing.sm,
  },

  // Day block
  dayBlock: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  dayHeadingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingRight: spacing.xs,
  },
  dayHeading: {
    fontSize: 36,
    fontWeight: '900' as const,
    color: TFK.headingPurple,
    letterSpacing: -0.5,
    // Text shadow gives the "bubbly" depth similar to TFK's Facebook posts
    textShadowColor: 'rgba(109,40,217,0.25)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  // Category block
  categoryBlock: {
    gap: spacing.xs,
  },
  categoryLabel: {
    fontSize: typography.headline,
    fontWeight: '800' as const,
    color: TFK.headingPink,
    letterSpacing: 0.2,
  },

  // Venue card (dark navy rounded card)
  venueCard: {
    backgroundColor: TFK.cardBg,
    borderRadius: radius.xl,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    overflow: 'hidden' as const,
  },

  // Venue row
  venueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  venueRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: TFK.rowDivider,
  },
  venueRowLeft: {
    flex: 1,
    gap: 2,
  },
  venueNameText: {
    fontSize: typography.callout,
    fontWeight: '700' as const,
    color: TFK.textWhite,
  },
  venueTimeText: {
    fontSize: typography.footnote,
    color: TFK.textMuted,
  },

  // Empty schedule
  emptySchedule: {
    alignItems: 'center' as const,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    color: TFK.textNavy,
    fontSize: typography.callout,
    opacity: 0.7,
  },

  // Leaderboard section
  leaderboardSection: {
    backgroundColor: TFK.cardBg,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: TFK.cardBorder,
  },
  leaderboardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.sm,
  },
  leaderboardHeaderText: {
    flex: 1,
    gap: 2,
  },
  leaderboardTitle: {
    fontSize: typography.title3,
    fontWeight: '800' as const,
    color: TFK.textWhite,
  },
  leaderboardSubtitle: {
    fontSize: typography.footnote,
    color: TFK.textMuted,
  },

  // Tabs
  tabRow: {
    flexDirection: 'row' as const,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: TFK.gold,
  },
  tabText: {
    fontSize: typography.subhead,
    fontWeight: '600' as const,
    color: TFK.textMuted,
  },
  tabTextActive: {
    color: TFK.textNavy,
    fontWeight: '700' as const,
  },

  // Leaderboard rows
  leaderboardRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingVertical: 10,
  },
  leaderboardRowWinner: {
    backgroundColor: TFK.winnerBg,
    marginHorizontal: -spacing.md,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: TFK.winnerBorder,
  },
  leaderboardRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: TFK.rowDivider,
  },
  leaderboardMedal: {
    fontSize: 20,
    width: 32,
    textAlign: 'center' as const,
  },
  leaderboardRowBody: {
    flex: 1,
    gap: 2,
  },
  leaderboardPlayerName: {
    fontSize: typography.callout,
    fontWeight: '700' as const,
    color: TFK.textWhite,
  },
  leaderboardWinnerText: {
    color: TFK.goldLight,
  },
  leaderboardVenue: {
    fontSize: typography.footnote,
    color: TFK.textMuted,
  },
  leaderboardPrize: {
    fontSize: typography.footnote,
    color: TFK.gold,
    fontStyle: 'italic' as const,
  },
  leaderboardScore: {
    fontSize: typography.subhead,
    fontWeight: '700' as const,
    color: TFK.textWhite,
  },

  // Leaderboard empty state
  leaderboardEmpty: {
    alignItems: 'center' as const,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  leaderboardEmptyTitle: {
    fontSize: typography.headline,
    fontWeight: '700' as const,
    color: TFK.textWhite,
    textAlign: 'center' as const,
  },
  leaderboardEmptyBody: {
    fontSize: typography.subhead,
    color: TFK.textMuted,
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },

  // Footer
  leaderboardFooter: {
    fontSize: typography.caption1,
    color: TFK.textMuted,
    textAlign: 'center' as const,
    marginTop: spacing.sm,
  },
  leaderboardRowDemo: {
    opacity: 0.5,
  },
  demoBanner: {
    backgroundColor: 'rgba(252,211,77,0.12)',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(252,211,77,0.3)',
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start' as const,
    marginBottom: spacing.sm,
  },
  demoBannerText: {
    fontSize: typography.caption2 ?? 10,
    fontWeight: '700' as const,
    color: TFK.goldLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  leaderboardDemoNote: {
    fontSize: typography.caption1,
    color: TFK.textMuted,
    textAlign: 'center' as const,
    marginTop: spacing.sm,
    fontStyle: 'italic' as const,
  },
}));
