import { useState, useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import HappyHourBanner from './HappyHourBanner';
import PartnerContactModal from './PartnerContactModal';
import Spacer from './Spacer';
import { getColors } from '../config/theme';
import { getActiveDailySpecials, SpecialWithRestaurant } from '../lib/specials';
import type { RootStackParamList } from '../navigation/types';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { usePlatformSocialProof } from '../hooks';
import { useMarket } from '../context/MarketContext';
import { trackClick } from '../lib/analytics';
import { trackImpression } from '../lib/impressions';

const BANNER_DURATION = 4000;
const FADE_DURATION = 300;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface DisplaySpecial {
  id: string;
  deal: string;
  restaurantName: string;
  timeWindow: string;
  imageUrl?: string;
  restaurantId?: string;
  isElite?: boolean;
}

function formatSpecialDeal(special: SpecialWithRestaurant): string {
  if (special.original_price && special.special_price) {
    const savings = Math.round((1 - Number(special.special_price) / Number(special.original_price)) * 100);
    return `${savings}% off — ${special.name}`;
  }
  if (special.special_price) {
    return `$${special.special_price} ${special.name}`;
  }
  if (special.discount_description) {
    return `${special.discount_description} — ${special.name}`;
  }
  return special.description || special.name;
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

export default function DailySpecialsSection() {
  const navigation = useNavigation<NavigationProp>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { data: socialProof } = usePlatformSocialProof();
  const { marketId } = useMarket();
  const colors = getColors();

  const { data: specials = [], isLoading, isFetching } = useQuery({
    queryKey: ['activeDailySpecials', marketId],
    queryFn: () => getActiveDailySpecials(marketId),
    staleTime: 5 * 60 * 1000,
  });

  const handleBannerPress = (restaurantId: string) => {
    trackClick('daily_special', restaurantId);
    navigation.navigate('RestaurantDetail', { id: restaurantId });
  };

  const handleViewAll = () => {
    navigation.navigate('SpecialsViewAll');
  };

  const handlePartnerCTA = () => {
    setContactModalVisible(true);
  };

  const allMappedSpecials: DisplaySpecial[] = specials
    .filter((s) => s.restaurant?.name)
    .map((s) => ({
      id: s.id,
      deal: formatSpecialDeal(s),
      restaurantName: s.restaurant.name,
      restaurantId: s.restaurant.id,
      timeWindow: formatTimeWindow(s.start_time, s.end_time),
      imageUrl: s.image_url || s.restaurant.cover_image_url || undefined,
      isElite: s.restaurant.has_pick_badge === true || s.restaurant.tiers?.name === 'elite',
    }));

  // DEDUPLICATE: Keep only one special per restaurant (first occurrence)
  const seenRestaurants = new Set<string>();
  const mappedSpecials = allMappedSpecials.filter(s => {
    if (seenRestaurants.has(s.restaurantId)) {
      return false;
    }
    seenRestaurants.add(s.restaurantId);
    return true;
  });

  // PREMIUM PLACEMENT: Restaurants with Elite tier or TasteLanc Pick badge always prioritized
  const pickBadgeSpecials = mappedSpecials.filter(s => s.isElite);
  const otherSpecials = mappedSpecials.filter(s => !s.isElite);

  // Randomize others (Fisher-Yates shuffle)
  const shuffledOthers = [...otherSpecials];
  for (let i = shuffledOthers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledOthers[i], shuffledOthers[j]] = [shuffledOthers[j], shuffledOthers[i]];
  }

  // Pick badge restaurants always first, then fill remaining slots with randomized others (cap at 3 total)
  const displayData: DisplaySpecial[] = [
    ...pickBadgeSpecials,
    ...shuffledOthers,
  ].slice(0, 3);

  const safeIndex = displayData.length > 0 ? currentIndex % displayData.length : 0;
  const currentBanner = displayData[safeIndex];

  useEffect(() => {
    setCurrentIndex(0);
    fadeAnim.setValue(1);
  }, [displayData.length, fadeAnim]);

  useEffect(() => {
    const banner = displayData[safeIndex];
    if (banner?.restaurantId) {
      trackImpression(banner.restaurantId, 'daily_specials', safeIndex);
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
        <Text style={styles.title}>Daily Specials</Text>
        <Text style={styles.subtitle}>
          {socialProof?.checkinsToday && socialProof.checkinsToday >= 3
            ? `${socialProof.checkinsToday} people checking deals today`
            : socialProof?.checkinsToday && socialProof.checkinsToday > 0
              ? 'People are checking deals today'
              : "Today's Best Deals"}
        </Text>
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
        category="special"
      />
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
}));
