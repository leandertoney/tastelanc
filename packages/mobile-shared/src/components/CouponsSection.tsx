import { useState, useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HappyHourBanner from './HappyHourBanner';
import Spacer from './Spacer';
import { getColors } from '../config/theme';
import { getActiveCoupons, CouponWithRestaurant, formatDiscount } from '../lib/coupons';
import type { RootStackParamList } from '../navigation/types';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { trackClick } from '../lib/analytics';
import { trackImpression } from '../lib/impressions';
import { queryKeys } from '../lib/queryKeys';

const BANNER_DURATION = 5000;
const FADE_DURATION = 300;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DisplayCoupon {
  id: string;
  deal: string;
  restaurantName: string;
  timeWindow: string;
  imageUrl?: string;
  restaurantId?: string;
  isElite?: boolean;
}

function formatTimeWindow(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return 'All Day';
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };
  return `${formatTime(startTime)}-${formatTime(endTime)}`;
}

export default function CouponsSection() {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { marketId } = useMarket();
  const colors = getColors();

  const { data: coupons = [], isLoading, isFetching } = useQuery({
    queryKey: queryKeys.coupons.active(marketId),
    queryFn: () => getActiveCoupons(marketId),
    staleTime: 5 * 60 * 1000,
  });

  const handleBannerPress = (restaurantId: string) => {
    trackClick('coupon', restaurantId);
    navigation.navigate('RestaurantDetail', { id: restaurantId });
  };

  const handleViewAll = () => {
    navigation.navigate('CouponsViewAll');
  };

  const mappedCoupons: DisplayCoupon[] = coupons
    .filter((c) => c.restaurant?.name)
    .map((c) => ({
      id: c.id,
      deal: `${formatDiscount(c)} — ${c.title}`,
      restaurantName: c.restaurant.name,
      restaurantId: c.restaurant.id,
      timeWindow: formatTimeWindow(c.start_time, c.end_time),
      imageUrl: c.image_url || c.restaurant.cover_image_url || undefined,
      isElite: c.restaurant.tiers?.name === 'elite',
    }))
    .slice(0, 5);

  const displayData = mappedCoupons;

  const safeIndex = displayData.length > 0 ? currentIndex % displayData.length : 0;
  const currentBanner = displayData[safeIndex];

  useEffect(() => {
    setCurrentIndex(0);
    fadeAnim.setValue(1);
  }, [displayData.length, fadeAnim]);

  useEffect(() => {
    const banner = displayData[safeIndex];
    if (banner?.restaurantId) {
      trackImpression(banner.restaurantId, 'coupons', safeIndex);
    }
  }, [safeIndex, displayData]);

  useEffect(() => {
    if (displayData.length <= 1) return;

    const cycleToNext = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => (prev + 1) % displayData.length);
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

  const styles = useStyles();

  if (displayData.length === 0 || !currentBanner) {
    if (isLoading || isFetching) return <View />;
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Coupons</Text>
          <View style={styles.badge}>
            <Ionicons name="ticket-outline" size={14} color={colors.textOnAccent} />
            <Text style={styles.badgeText}>{displayData.length} available</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>Redeem in the app, show at the restaurant</Text>
      </View>

      <Spacer size="sm" />

      <Animated.View style={[styles.bannerContainer, { opacity: fadeAnim }]}>
        <HappyHourBanner
          deal={currentBanner.deal}
          restaurantName={currentBanner.restaurantName}
          timeWindow={currentBanner.timeWindow}
          imageUrl={currentBanner.imageUrl}
          onPress={currentBanner.restaurantId ? () => handleBannerPress(currentBanner.restaurantId!) : undefined}
          fullWidth
          isElite={currentBanner.isElite}
        />
      </Animated.View>

      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={handleViewAll}>
          <Text style={styles.viewAll}>View All Coupons</Text>
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

const useStyles = createLazyStyles((colors) => ({
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
  bannerContainer: {
    paddingHorizontal: spacing.md,
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
}));
