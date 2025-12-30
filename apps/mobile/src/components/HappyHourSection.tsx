import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import HappyHourBanner from './HappyHourBanner';
import Spacer from './Spacer';
import { supabase } from '../lib/supabase';
import type { HappyHour, HappyHourItem, Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_HAPPY_HOURS } from '../config/mockData';
import { usePlatformSocialProof } from '../hooks';

const DISPLAY_DURATION = 4000; // 4 seconds per banner
const FADE_DURATION = 300; // 300ms fade transition

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HappyHourWithRestaurant extends HappyHour {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url'>;
  items?: HappyHourItem[];
}

// Display format for happy hour banners
interface DisplayHappyHour {
  id: string;
  deal: string;
  restaurantName: string;
  timeWindow: string;
  imageUrl?: string;
  restaurantId?: string;
}

// Convert centralized mock data to display format
const MOCK_DISPLAY_HAPPY_HOURS: DisplayHappyHour[] = MOCK_HAPPY_HOURS.map((hh) => ({
  id: hh.id,
  deal: hh.deal,
  restaurantName: hh.restaurantName,
  timeWindow: hh.timeWindow,
  imageUrl: hh.imageUrl,
  restaurantId: hh.restaurantId,
}));

function getDayOfWeek(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

// Paid tier IDs
const PAID_TIER_IDS = [
  'dd1789e3-e816-44ff-a93f-962d51a7888e', // premium
  '589e2533-fccd-4ac5-abe1-006dd9326485', // elite
];

async function getActiveHappyHours(): Promise<HappyHourWithRestaurant[]> {
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

  // Get happy hours from paid restaurants only
  const { data, error } = await supabase
    .from('happy_hours')
    .select(`
      *,
      restaurant:restaurants!inner(id, name, cover_image_url, tier_id),
      items:happy_hour_items(*)
    `)
    .eq('is_active', true)
    .in('restaurant.tier_id', PAID_TIER_IDS)
    .contains('days_of_week', [dayOfWeek])
    .lte('start_time', currentTime)
    .gte('end_time', currentTime)
    .limit(10);

  if (error) throw error;
  return data || [];
}

function formatDealText(happyHour: HappyHourWithRestaurant): string {
  // If there are items, use the first item's description
  if (happyHour.items && happyHour.items.length > 0) {
    const item = happyHour.items[0];
    if (item.original_price && item.discounted_price) {
      const discount = Math.round((1 - item.discounted_price / item.original_price) * 100);
      return `${discount}% off ${item.name}`;
    }
    return item.discounted_price ? `$${item.discounted_price} ${item.name}` : item.name;
  }
  return happyHour.name;
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
  const [dayOfWeek] = useState(getDayOfWeek());
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { data: socialProof } = usePlatformSocialProof();

  const { data: happyHours = [], isLoading } = useQuery({
    queryKey: ['activeHappyHours'],
    queryFn: getActiveHappyHours,
    staleTime: 5 * 60 * 1000,
  });

  const handleBannerPress = (restaurantId: string) => {
    navigation.navigate('RestaurantDetail', { id: restaurantId });
  };

  const handleViewAll = () => {
    navigation.navigate('HappyHoursViewAll');
  };

  // Map real happy hours to display format
  const mappedHappyHours: DisplayHappyHour[] = happyHours.map((hh) => ({
    id: hh.id,
    deal: formatDealText(hh),
    restaurantName: hh.restaurant.name,
    restaurantId: hh.restaurant.id,
    timeWindow: formatTimeWindow(hh.start_time, hh.end_time),
    imageUrl: hh.restaurant.cover_image_url || undefined,
  }));

  // Use real data, or mock data if enabled and no real data
  const displayData: DisplayHappyHour[] =
    mappedHappyHours.length > 0 ? mappedHappyHours : ENABLE_MOCK_DATA ? MOCK_DISPLAY_HAPPY_HOURS : [];

  // Auto-cycle with fade transition
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

    timerRef.current = setInterval(cycleToNext, DISPLAY_DURATION);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [displayData.length, fadeAnim]);

  const currentBanner = displayData[currentIndex];

  // No loading state - data is prefetched during splash screen
  if (displayData.length === 0) {
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
          deal={currentBanner.deal}
          restaurantName={currentBanner.restaurantName}
          timeWindow={currentBanner.timeWindow}
          imageUrl={currentBanner.imageUrl}
          onPress={currentBanner.restaurantId ? () => handleBannerPress(currentBanner.restaurantId!) : undefined}
          fullWidth
        />
      </Animated.View>

      {/* View All and Progress dots row */}
      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={handleViewAll}>
          <Text style={styles.viewAll}>View All</Text>
        </TouchableOpacity>
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
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
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
