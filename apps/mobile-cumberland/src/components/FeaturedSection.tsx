import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  ViewToken,
  Modal,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/types';
import FeaturedCard, { CARD_WIDTH } from './FeaturedCard';
import FeaturedAdCard, { ShimmerSweep, Particle, GlowBorder, SponsoredBadge } from './FeaturedAdCard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { getFeaturedRestaurants, getUserPreferences, getRecommendationReason } from '../lib/recommendations';
import type { OnboardingData } from '../types/onboarding';
import { useFavorites, useToggleFavorite, useEmailGate, useActiveAds } from '../hooks';
import { useMarket } from '../context/MarketContext';
import type { Restaurant, FeaturedAd } from '../types/database';
import { colors, radius, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_FEATURED_RESTAURANTS } from '../config/mockData';
import { trackImpression } from '../lib/impressions';
import { trackAdImpression, trackAdClick } from '../lib/ads';
import { injectAdsIntoCarousel, type CarouselItem } from '../lib/carouselUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Stable empty arrays to prevent infinite re-render loops from unstable defaults
const EMPTY_RESTAURANTS: Restaurant[] = [];
const EMPTY_ADS: FeaturedAd[] = [];

// Horizontal padding to center items and show partial cards on edges
const SIDE_PADDING = (SCREEN_WIDTH - CARD_WIDTH) / 2;
export const ITEM_SPACING = spacing.sm * 2; // Gap between cards

// ---------- Overlay popup dimensions ----------
const OVERLAY_WIDTH = SCREEN_WIDTH * 0.92;
const OVERLAY_HEIGHT = Math.min(OVERLAY_WIDTH * 1.4, SCREEN_HEIGHT * 0.75);

// Overlay-specific particles (scaled for larger card)
const OVERLAY_PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  startX: Math.random() * OVERLAY_WIDTH * 0.8 + OVERLAY_WIDTH * 0.1,
  size: Math.random() * 4 + 3,
  delay: Math.random() * 3000,
  duration: 4000 + Math.random() * 3000,
  opacity: 0.15 + Math.random() * 0.25,
}));

interface FeaturedSectionProps {
  onRestaurantPress: (restaurant: Restaurant) => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FeaturedSection({ onRestaurantPress }: FeaturedSectionProps) {
  const navigation = useNavigation<NavigationProp>();
  const { requireEmailGate } = useEmailGate();
  const { marketId } = useMarket();
  const flatListRef = useRef<FlatList<CarouselItem>>(null);
  const [extendedData, setExtendedData] = useState<CarouselItem[]>([]);

  // ---------- Overlay popup state ----------
  const [overlayAd, setOverlayAd] = useState<FeaturedAd | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const shownAdIds = useRef(new Set<string>());

  // Fetch featured restaurants
  const {
    data: restaurants = EMPTY_RESTAURANTS,
    isError,
  } = useQuery({
    queryKey: ['featuredRestaurants', marketId],
    queryFn: () => getFeaturedRestaurants(16, marketId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!marketId,
  });

  // Fetch active ads
  const { data: activeAds = EMPTY_ADS } = useActiveAds();

  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();

  // Load user preferences for recommendation reason badges
  const { data: userPreferences = null } = useQuery<OnboardingData | null>({
    queryKey: ['userPreferences'],
    queryFn: getUserPreferences,
    staleTime: 30 * 60 * 1000, // 30 min — preferences change rarely
  });

  // Inject ads into the restaurant list (every 3rd card)
  const displayItems = useMemo<CarouselItem[]>(() => {
    const source = restaurants.length > 0
      ? restaurants
      : ENABLE_MOCK_DATA
        ? MOCK_FEATURED_RESTAURANTS
        : [];
    if (source.length === 0) return [];
    return injectAdsIntoCarousel(source, activeAds, 3);
  }, [restaurants, activeAds]);

  // Create extended data for infinite scroll effect
  // Only triple data if we have more than 1 item, otherwise just show single item
  useEffect(() => {
    if (displayItems.length > 1) {
      // Triple the data for seamless infinite scroll
      setExtendedData([...displayItems, ...displayItems, ...displayItems]);
    } else if (displayItems.length === 1) {
      setExtendedData(displayItems);
    } else {
      setExtendedData([]);
    }
  }, [displayItems]);

  // Initialize scroll position to middle set (only for infinite scroll with multiple items)
  useEffect(() => {
    if (extendedData.length > 1 && displayItems.length > 1 && flatListRef.current) {
      const middleIndex = displayItems.length;
      setTimeout(() => {
        (flatListRef.current as any)?.scrollToIndex({
          index: middleIndex,
          animated: false,
        });
      }, 100);
    }
  }, [extendedData.length, displayItems.length]);

  const handleFavoritePress = useCallback(
    (restaurantId: string) => {
      toggleFavoriteMutation.mutate(restaurantId);
    },
    [toggleFavoriteMutation]
  );

  // Track impressions when items become visible
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as CarouselItem;
      if (!item) continue;

      const realIndex = displayItems.length > 0
        ? (token.index ?? 0) % displayItems.length
        : token.index ?? 0;

      if (item.type === 'restaurant') {
        const restaurant = item.data as Restaurant;
        if (restaurant?.id) {
          trackImpression(restaurant.id, 'featured', realIndex);
        }
      } else if (item.type === 'ad') {
        const ad = item.data as FeaturedAd;
        if (ad?.id) {
          trackAdImpression(ad.id, realIndex);
        }
      }
    }
  }).current;

  // Handle scroll end: infinite scroll looping + detect centered ad for overlay
  const handleScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (displayItems.length === 0) return;

      const offsetX = event.nativeEvent.contentOffset.x;
      const totalWidth = (CARD_WIDTH + ITEM_SPACING) * displayItems.length;

      // If scrolled to the last set, jump back to middle
      if (offsetX >= totalWidth * 2 - CARD_WIDTH) {
        (flatListRef.current as any)?.scrollToOffset({
          offset: totalWidth + offsetX - totalWidth * 2,
          animated: false,
        });
      }
      // If scrolled to the first set, jump to middle
      else if (offsetX <= 0) {
        (flatListRef.current as any)?.scrollToOffset({
          offset: totalWidth,
          animated: false,
        });
      }

      // Check if the centered item is an ad → show overlay popup
      const centeredIndex = Math.round(offsetX / (CARD_WIDTH + ITEM_SPACING));
      if (centeredIndex >= 0 && centeredIndex < extendedData.length) {
        const item = extendedData[centeredIndex];
        if (item?.type === 'ad') {
          const ad = item.data as FeaturedAd;
          // Only show each ad overlay once per session
          if (!shownAdIds.current.has(ad.id)) {
            shownAdIds.current.add(ad.id);
            // Small delay so carousel finishes settling before popup appears
            setTimeout(() => {
              setOverlayAd(ad);
              setOverlayVisible(true);
            }, 400);
          }
        }
      }
    },
    [displayItems.length, extendedData]
  );

  // Dismiss the overlay popup
  const dismissOverlay = useCallback(() => {
    setOverlayVisible(false);
    // Keep overlayAd data alive during fade-out animation, then clear
    setTimeout(() => setOverlayAd(null), 350);
  }, []);

  // Handle tap on the overlay ad → open URL and dismiss
  const handleOverlayAdPress = useCallback(() => {
    if (!overlayAd) return;
    trackAdClick(overlayAd.id, 0);
    Linking.openURL(overlayAd.click_url).catch((err) => {
      console.warn('Failed to open ad URL:', err);
    });
    dismissOverlay();
  }, [overlayAd, dismissOverlay]);

  const renderItem = useCallback(
    ({ item, index }: { item: CarouselItem; index: number }) => {
      if (item.type === 'ad') {
        const ad = item.data as FeaturedAd;
        const realIndex = displayItems.length > 0
          ? index % displayItems.length
          : index;
        return (
          <FeaturedAdCard
            ad={ad}
            positionIndex={realIndex}
          />
        );
      }

      const restaurant = item.data as Restaurant;
      const isElite = (restaurant as any).tiers?.name === 'elite';
      return (
        <FeaturedCard
          restaurant={restaurant}
          onPress={() => onRestaurantPress(restaurant)}
          isFavorite={favorites.includes(restaurant.id)}
          onFavoritePress={() => handleFavoritePress(restaurant.id)}
          reasonBadge={getRecommendationReason(restaurant, userPreferences)}
          isElite={isElite}
        />
      );
    },
    [favorites, handleFavoritePress, onRestaurantPress, userPreferences, displayItems.length, restaurants]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_WIDTH + ITEM_SPACING,
      offset: (CARD_WIDTH + ITEM_SPACING) * index,
      index,
    }),
    []
  );

  // No loading state - data is prefetched during splash screen
  if (isError || displayItems.length === 0) {
    return null; // Don't show section if no data
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Featured for You"
        actionText="View All"
        onActionPress={() => requireEmailGate(() => navigation.navigate('FeaturedViewAll'))}
      />
      <Spacer size="sm" />

      <View style={styles.listWrapper}>
        <FlatList
          ref={flatListRef}
          data={extendedData}
          renderItem={renderItem}
          keyExtractor={(item: CarouselItem, index: number) => `${item.key}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + ITEM_SPACING}
          snapToAlignment="center"
          decelerationRate="fast"
          contentContainerStyle={styles.listContent}
          getItemLayout={getItemLayout}
          onMomentumScrollEnd={handleScrollEnd}
          initialNumToRender={3}
          maxToRenderPerBatch={5}
          windowSize={5}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      </View>

      {/* ---- Full-screen ad overlay popup ---- */}
      <Modal
        transparent
        visible={overlayVisible}
        animationType="fade"
        onRequestClose={dismissOverlay}
        statusBarTranslucent
      >
        {overlayAd && (
          <View style={overlayStyles.backdrop}>
            {/* Invisible full-screen press target for backdrop dismiss */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={dismissOverlay}
            />

            {/* Card wrapper — box-none lets taps outside children reach backdrop */}
            <View style={overlayStyles.cardWrapper} pointerEvents="box-none">
              {/* Close button above the card */}
              <TouchableOpacity
                style={overlayStyles.closeButton}
                onPress={dismissOverlay}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <View style={overlayStyles.closeButtonInner}>
                  <Ionicons name="close" size={20} color="#fff" />
                </View>
              </TouchableOpacity>

              {/* The ad card at full overlay size */}
              <TouchableOpacity
                style={overlayStyles.card}
                onPress={handleOverlayAdPress}
                activeOpacity={0.95}
              >
                <Image source={{ uri: overlayAd.image_url }} style={overlayStyles.image} />
                <GlowBorder />
                <ShimmerSweep width={OVERLAY_WIDTH} height={OVERLAY_HEIGHT} />
                {OVERLAY_PARTICLES.map((p) => (
                  <Particle key={p.id} {...p} height={OVERLAY_HEIGHT} />
                ))}
                <SponsoredBadge />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  listWrapper: {},
  listContent: {
    paddingHorizontal: SIDE_PADDING,
  },
});

const overlayStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardWrapper: {
    alignItems: 'flex-end',
    width: OVERLAY_WIDTH,
  },
  closeButton: {
    marginBottom: spacing.sm,
    marginRight: spacing.xs,
  },
  closeButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: OVERLAY_WIDTH,
    height: OVERLAY_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.cardBg,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
