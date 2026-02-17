import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HappyHourBanner from './HappyHourBanner';
import PartnerContactModal from './PartnerContactModal';
import Spacer from './Spacer';
import { supabase } from '../lib/supabase';
import { paidFairRotate, getTierName, eliteFirstStableSort } from '../lib/fairRotation';
import type { HappyHour, HappyHourItem, Restaurant, Tier } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_HAPPY_HOURS } from '../config/mockData';
import { usePlatformSocialProof, useEmailGate } from '../hooks';
import { useMarket } from '../context/MarketContext';
import { trackClick } from '../lib/analytics';
import { trackImpression } from '../lib/impressions';

const BANNER_DURATION = 4000; // 4 seconds per banner (equal for all)
const FADE_DURATION = 300; // 300ms fade transition
const DEAL_FADE_DURATION = 200; // 200ms fade for deal text rotation
const DEAL_PAIR_DURATION = 2000; // 2 seconds per deal pair

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HappyHourWithRestaurant extends HappyHour {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url'> & {
    tiers: Pick<Tier, 'name'> | null;
  };
  items?: HappyHourItem[];
}

// Display format for happy hour banners
interface DisplayHappyHour {
  id: string;
  deals: string[]; // Array of deal texts to rotate through
  restaurantName: string;
  timeWindow: string;
  imageUrl?: string;
  restaurantId?: string;
  isElite?: boolean;
}

// Convert centralized mock data to display format
const MOCK_DISPLAY_HAPPY_HOURS: DisplayHappyHour[] = MOCK_HAPPY_HOURS.map((hh) => ({
  id: hh.id,
  deals: [hh.deal], // Mock data has single deal
  restaurantName: hh.restaurantName,
  timeWindow: hh.timeWindow,
  imageUrl: hh.imageUrl,
  restaurantId: hh.restaurantId,
}));

function getDayOfWeek(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

async function getActiveHappyHours(marketId: string | null = null): Promise<HappyHourWithRestaurant[]> {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  // Fetch all today's happy hours with tier data (no limit - we filter client-side)
  let query = supabase
    .from('happy_hours')
    .select(`
      *,
      restaurant:restaurants!inner(id, name, cover_image_url, tier_id, market_id, tiers(name)),
      items:happy_hour_items(*)
    `)
    .eq('is_active', true)
    .contains('days_of_week', [dayOfWeek])
    .order('display_order', { referencedTable: 'happy_hour_items', ascending: true });

  if (marketId) {
    query = query.eq('restaurant.market_id', marketId);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('getActiveHappyHours query failed:', error.message);
    return [];
  }

  // Filter to paid restaurants only and apply fair rotation (Elite first, Premium shuffled)
  const paidRotated = paidFairRotate(
    data || [],
    (hh) => getTierName({ restaurant: hh.restaurant }),
  );

  // Sort chronologically by start time
  paidRotated.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  // Re-establish elite-first priority (preserves chronological within tier groups)
  const tierSorted = eliteFirstStableSort(
    paidRotated,
    (hh) => getTierName({ restaurant: hh.restaurant }),
  );

  return tierSorted.slice(0, 15);
}

function formatDealTexts(happyHour: HappyHourWithRestaurant): string[] {
  // If there are individual items, format each one for rotation
  if (happyHour.items && happyHour.items.length > 0) {
    return happyHour.items.map((item) => {
      if (item.discount_description) {
        return `${item.discount_description} ${item.name}`;
      }
      if (item.original_price && item.discounted_price) {
        const discount = Math.round((1 - item.discounted_price / item.original_price) * 100);
        return `${discount}% off ${item.name}`;
      }
      return item.discounted_price ? `$${item.discounted_price} ${item.name}` : item.name;
    });
  }
  // Fallback to description or name
  return [happyHour.description || happyHour.name];
}

function formatTimeWindow(startTime: string, endTime: string): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };
  return `${formatTime(startTime)}-${formatTime(endTime)}`;
}

export default function HappyHourSection() {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentDealIndex, setCurrentDealIndex] = useState(0);
  const [dayOfWeek] = useState(getDayOfWeek());
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const dealFadeAnim = useRef(new Animated.Value(1)).current;
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const dealTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { data: socialProof } = usePlatformSocialProof();
  const { marketId } = useMarket();

  const { data: happyHours = [], isLoading, isFetching } = useQuery({
    queryKey: ['activeHappyHours', marketId],
    queryFn: () => getActiveHappyHours(marketId),
    staleTime: 5 * 60 * 1000,
  });

  const handleBannerPress = (restaurantId: string) => {
    trackClick('happy_hour', restaurantId);
    navigation.navigate('RestaurantDetail', { id: restaurantId });
  };

  const { requireEmailGate } = useEmailGate();

  const handleViewAll = () => {
    requireEmailGate(() => navigation.navigate('HappyHoursViewAll'));
  };

  const handlePartnerCTA = () => {
    setContactModalVisible(true);
  };

  // Map real happy hours to display format (filter out entries with missing restaurant data)
  const mappedHappyHours: DisplayHappyHour[] = happyHours
    .filter((hh) => hh.restaurant?.name)
    .map((hh) => ({
      id: hh.id,
      deals: formatDealTexts(hh),
      restaurantName: hh.restaurant.name,
      restaurantId: hh.restaurant.id,
      timeWindow: formatTimeWindow(hh.start_time, hh.end_time),
      imageUrl: hh.image_url || hh.restaurant.cover_image_url || undefined,
      isElite: hh.restaurant.tiers?.name === 'elite',
    }));

  // Elite first, then remaining — cap at 5 banners for the home screen rotation
  const prioritized = [...mappedHappyHours]
    .sort((a, b) => (a.isElite === b.isElite ? 0 : a.isElite ? -1 : 1))
    .slice(0, 5);

  // Use real data, or mock data if enabled and no real data
  const displayData: DisplayHappyHour[] =
    prioritized.length > 0 ? prioritized : ENABLE_MOCK_DATA ? MOCK_DISPLAY_HAPPY_HOURS : [];

  // Ensure currentIndex is valid when displayData changes
  const safeIndex = displayData.length > 0 ? currentIndex % displayData.length : 0;
  const currentBanner = displayData[safeIndex];
  const dealCount = currentBanner?.deals.length || 1;
  // Number of pairs (2 deals per pair, rounded up)
  const pairCount = Math.ceil(dealCount / 2);

  // Reset indices when displayData changes
  useEffect(() => {
    setCurrentIndex(0);
    setCurrentDealIndex(0);
    fadeAnim.setValue(1);
    dealFadeAnim.setValue(1);
  }, [displayData.length, fadeAnim, dealFadeAnim]);

  // Reset deal index when banner changes + track impression
  useEffect(() => {
    setCurrentDealIndex(0);
    dealFadeAnim.setValue(1);

    // Track impression for the currently visible banner
    const banner = displayData[safeIndex];
    if (banner?.restaurantId) {
      trackImpression(banner.restaurantId, 'happy_hours', safeIndex);
    }
  }, [safeIndex, dealFadeAnim, displayData]);

  // Auto-cycle banners with fade transition
  useEffect(() => {
    if (displayData.length <= 1) return;

    const cycleToNext = () => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        // Update index
        setCurrentIndex((prev) => (prev + 1) % displayData.length);
        // Fade in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }).start();
      });
    };

    bannerTimerRef.current = setInterval(cycleToNext, BANNER_DURATION);

    return () => {
      if (bannerTimerRef.current) {
        clearInterval(bannerTimerRef.current);
      }
    };
  }, [displayData.length, fadeAnim]);

  // Auto-rotate deal pairs within current banner
  useEffect(() => {
    if (pairCount <= 1) return;

    const rotateDealPair = () => {
      // Fade out
      Animated.timing(dealFadeAnim, {
        toValue: 0,
        duration: DEAL_FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        // Update to next pair
        setCurrentDealIndex((prev) => (prev + 1) % pairCount);
        // Fade in
        Animated.timing(dealFadeAnim, {
          toValue: 1,
          duration: DEAL_FADE_DURATION,
          useNativeDriver: true,
        }).start();
      });
    };

    dealTimerRef.current = setInterval(rotateDealPair, DEAL_PAIR_DURATION);

    return () => {
      if (dealTimerRef.current) {
        clearInterval(dealTimerRef.current);
      }
    };
  }, [pairCount, dealFadeAnim]);

  // Hide only when query has settled and there's genuinely no data
  if (displayData.length === 0 || !currentBanner) {
    if (isLoading || isFetching) return <View />;
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Custom header with prominent day indicator */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Happy Hour Specials</Text>
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{dayOfWeek}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {socialProof?.checkinsToday && socialProof.checkinsToday >= 3
            ? `${socialProof.checkinsToday} people checking deals today`
            : socialProof?.checkinsToday && socialProof.checkinsToday > 0
              ? 'People are checking deals today'
              : "Today's Best Deals"}
        </Text>
      </View>

      <Spacer size="sm" />

      {/* Single banner with fade animation */}
      <Animated.View style={[styles.bannerContainer, { opacity: fadeAnim }]}>
        <HappyHourBanner
          deal={currentBanner.deals[currentDealIndex * 2] || currentBanner.deals[0]}
          deal2={currentBanner.deals[currentDealIndex * 2 + 1]}
          restaurantName={currentBanner.restaurantName}
          timeWindow={currentBanner.timeWindow}
          imageUrl={currentBanner.imageUrl}
          onPress={currentBanner.restaurantId ? () => handleBannerPress(currentBanner.restaurantId!) : undefined}
          fullWidth
          dealOpacity={pairCount > 1 ? dealFadeAnim : undefined}
          isElite={currentBanner.isElite}
        />
      </Animated.View>

      {/* View All and Progress dots row */}
      <View style={styles.bottomRow}>
        <View style={styles.bottomLinks}>
          <TouchableOpacity onPress={handleViewAll}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
          <Text style={styles.linkDivider}>|</Text>
          <TouchableOpacity onPress={handlePartnerCTA} style={styles.ctaLink}>
            <Text style={styles.ctaText}>List your deal</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
        {displayData.length > 1 && (
          <View style={styles.dotsContainer}>
            {displayData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <PartnerContactModal
        visible={contactModalVisible}
        onClose={() => setContactModalVisible(false)}
        category="happy_hour"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  linkDivider: {
    fontSize: 14,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
    opacity: 0.5,
  },
  ctaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  dayBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerContainer: {
    paddingHorizontal: spacing.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    opacity: 1,
    width: 20,
  },
});
