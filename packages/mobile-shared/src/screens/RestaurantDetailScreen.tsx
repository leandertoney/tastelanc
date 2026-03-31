import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type {
  Restaurant,
  RestaurantWithTier,
  RestaurantHours,
  HappyHour,
  Special,
  Event,
  Tier,
  Menu,
} from '../types/database';
import { getColors, getBrand, getSupabase, hasFeature } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { fetchEvents } from '../lib/events';
import { trackScreenView, trackClick } from '../lib/analytics';
import { useAuth } from '../hooks/useAuth';
import { useEmailGate } from '../hooks/useEmailGate';
import { useMarket } from '../context/MarketContext';
import { useFavorites, useToggleFavorite } from '../hooks';
import { useIsWishlisted, useToggleWishlist } from '../hooks/useWishlist';
import {
  TagChip,
  RatingStars,
  QuickActionsBar,
  SectionCard,
  MenuViewer,
  PhotosCarousel,
  RatingSubmit,
  PersonalityDescription,
  TabBar,
  OpenStatusBadge,
} from '../components';
import { useRestaurantWeekIds } from '../hooks/useRestaurantWeekIds';
import { useCoffeeChocolateTrailIds } from '../hooks/useCoffeeChocolateTrailIds';
import RestaurantWeekBadge from '../components/RestaurantWeekBadge';
import CoffeeChocolateTrailBadge from '../components/CoffeeChocolateTrailBadge';
import HoursAccordion from '../components/HoursAccordion';
import TierLockedEmptyState from '../components/TierLockedEmptyState';
import VideoRecommendationFeed from '../components/VideoRecommendationFeed';
import type { Tab } from '../components';
import { formatCategoryName, formatTime, formatFeatureName, getFeatureIconName } from '../lib/formatters';
import { getRestaurantCoupons, formatDiscount, claimCoupon, type Coupon } from '../lib/coupons';
import { useRecordVisit } from '../hooks/useRadarVisits';
import { useUserLocation, calculateDistance } from '../hooks/useUserLocation';
import { useRecordCheckinForSocialProof } from '../hooks/useSocialProof';
import { earnPoints, POINT_VALUES } from '../lib/rewards';
import { rewardsQueryKeys } from '../hooks/useRewards';
import { requestReviewIfEligible } from '../lib/reviewPrompts';
import { LocationUpgradePrompt } from '../components/LocationUpgradePrompt';
import {
  hasMenuAccess,
  hasSpecialsAccess,
  hasHappyHourAccess,
  hasEventsAccess,
  hasRecommendationsAccess,
  type SubscriptionTier,
} from '../lib/tier-access';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;
const ELITE_HERO_HEIGHT = 350;

// Day abbreviations for hours display
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Get current day of week
const getCurrentDay = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

// Tab configuration (function to avoid module-level theme access)
function getBaseTabs(): Tab[] {
  return [
    { key: 'recommendations', label: 'Recs' },
    ...(hasFeature('happyHours') ? [{ key: 'happy_hours' as const, label: 'Happy Hours' }] : []),
    { key: 'specials', label: 'Specials' },
    { key: 'coupons', label: 'Coupons' },
    { key: 'events', label: 'Events' },
    { key: 'menu', label: 'Menu' },
  ];
}

export default function RestaurantDetailScreen({ route, navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const supabase = getSupabase();
  const { id } = route.params;
  const { userId } = useAuth();
  const { requireEmailGate } = useEmailGate();
  const { marketId } = useMarket();

  // Use hooks for favorites - handles signup modal automatically
  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const isFavorite = favorites.includes(id);
  const isWishlisted = useIsWishlisted(id);
  const { mutate: toggleWishlist } = useToggleWishlist();

  const [restaurant, setRestaurant] = useState<RestaurantWithTier | null>(null);
  const [tierName, setTierName] = useState<SubscriptionTier | null>(null);
  const [hours, setHours] = useState<RestaurantHours[]>([]);
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [claimingCouponId, setClaimingCouponId] = useState<string | null>(null);
  const [claimedCouponIds, setClaimedCouponIds] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<Event[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [activeInfoTab, setActiveInfoTab] = useState<'hours' | 'contact' | 'rate'>('hours');
  const [isRecordingVisit, setIsRecordingVisit] = useState(false);
  const [visitRecorded, setVisitRecorded] = useState(false);
  const [imHerePointsEarned, setImHerePointsEarned] = useState(0);
  const [showLocationUpgrade, setShowLocationUpgrade] = useState(false);

  const queryClient = useQueryClient();

  // "I'm Here" proximity-gated visit recording + rewards
  const { recordVisit } = useRecordVisit();
  const { location: userLocation, refreshLocation } = useUserLocation();
  const recordCheckinForSocialProof = useRecordCheckinForSocialProof();


  const fetchRestaurantData = useCallback(async () => {
    try {
      setError(null);

      // Fetch restaurant details first (with tier information for gating)
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*, restaurant_photos(url, display_order, is_cover), tiers(name, display_name)')
        .eq('id', id)
        .single();

      if (restaurantError) {
        console.error('Restaurant query error:', restaurantError);
        throw restaurantError;
      }

      // Check if restaurant was found
      if (!restaurantData) {
        throw new Error('Restaurant not found');
      }

      // Transform photos array - exclude cover photo since it's already shown at the top
      const photos = restaurantData.restaurant_photos
        ?.filter((p: any) => !p.is_cover)
        ?.sort((a: any, b: any) => a.display_order - b.display_order)
        ?.map((p: any) => p.url) || [];

      // Extract tier data
      const tierData = restaurantData.tiers;
      const { tiers: _, ...rest } = restaurantData;

      // Set restaurant and tier
      setRestaurant({ ...rest, photos, tiers: tierData });
      setTierName(tierData?.name || null);

      // Fetch related data in parallel
      const [hoursRes, happyHoursRes, specialsRes, eventsData, menusRes, couponsData] = await Promise.all([
        supabase.from('restaurant_hours').select('*').eq('restaurant_id', id),
        supabase.from('happy_hours').select('*, happy_hour_items(*)').eq('restaurant_id', id).eq('is_active', true),
        supabase.from('specials').select('*').eq('restaurant_id', id).eq('is_active', true),
        fetchEvents({ restaurant_id: id }),
        supabase
          .from('menus')
          .select('*, menu_sections(*, menu_items(*))')
          .eq('restaurant_id', id)
          .eq('is_active', true)
          .order('display_order'),
        getRestaurantCoupons(id),
      ]);

      if (hoursRes.data) setHours(hoursRes.data);
      if (happyHoursRes.data) setHappyHours(happyHoursRes.data);
      if (specialsRes.data) setSpecials(specialsRes.data);
      if (menusRes.data) setMenus((menusRes.data as Menu[]).filter(m => !m.is_hidden_from_tab));
      setCoupons(couponsData);
      // Map API events to Event type
      setEvents(eventsData.map(e => ({
        id: e.id,
        restaurant_id: id,
        name: e.name,
        description: e.description || null,
        event_type: e.event_type,
        is_recurring: e.is_recurring,
        days_of_week: e.days_of_week,
        event_date: e.event_date || null,
        start_time: e.start_time,
        end_time: e.end_time,
        performer_name: e.performer_name || null,
        cover_charge: e.cover_charge || null,
        image_url: e.image_url,
        is_active: true,
      })));
    } catch (err) {
      console.error('Error fetching restaurant:', err);
      setError('Failed to load restaurant details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, navigation]);

  useEffect(() => {
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  // Track screen view when restaurant loads
  useEffect(() => {
    if (restaurant) {
      trackScreenView('RestaurantDetail', id);
      trackScreenView('RestaurantHappyHours', id);
    }
  }, [restaurant, id]);

  // Track tab views when user switches tabs
  const handleTabPress = useCallback((tabKey: string) => {
    setActiveTab(tabKey);
    const tabScreenMap: Record<string, string> = {
      happy_hours: 'RestaurantHappyHours',
      specials: 'RestaurantSpecials',
      events: 'RestaurantEvents',
      menu: 'RestaurantMenu',
    };
    const screenName = tabScreenMap[tabKey];
    if (screenName) {
      trackScreenView(screenName, id);
    }
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  // Handle favorite press - the hook handles signup modal automatically
  const handleFavoritePress = useCallback(() => {
    toggleFavoriteMutation.mutate(id);
  }, [id, toggleFavoriteMutation]);

  const PROXIMITY_THRESHOLD_MILES = 0.124; // ~200 meters

  const handleImHere = useCallback(async () => {
    if (!userId || isRecordingVisit || visitRecorded) return;

    // Refresh location to get latest position
    await refreshLocation();

    // Check proximity to restaurant
    if (!restaurant?.latitude || !restaurant?.longitude) {
      Alert.alert('Location Unavailable', 'This restaurant does not have location data.');
      return;
    }

    if (!userLocation) {
      Alert.alert(
        'Location Required',
        'Please enable location services to confirm your visit.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    const distanceMiles = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      restaurant.latitude,
      restaurant.longitude
    );

    if (distanceMiles > PROXIMITY_THRESHOLD_MILES) {
      Alert.alert(
        'Too Far Away',
        `You need to be at or near ${restaurant.name} to confirm your visit.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Within proximity — record visit, award points, record social proof
    setIsRecordingVisit(true);
    try {
      const result = await recordVisit(id);

      if (result.alreadyRecorded) {
        setVisitRecorded(true);
        Alert.alert(
          'Already Checked In',
          "You've already checked in here today. Come back tomorrow!",
          [{ text: 'OK' }]
        );
        return;
      }

      if (result.error) {
        Alert.alert('Error', 'Failed to record visit. Please try again.', [{ text: 'OK' }]);
        return;
      }

      setVisitRecorded(true);

      // Award points (same as PIN check-in did)
      let pointsEarned = POINT_VALUES.checkin;
      try {
        const rewardsResult = await earnPoints({
          action_type: 'checkin',
          restaurant_id: id,
          radar_verified: true,
        });
        pointsEarned = rewardsResult.points_earned;
      } catch (rewardsErr) {
        console.warn('[ImHere] Rewards API failed:', rewardsErr);
      }

      // Record to checkins table for social proof aggregation
      recordCheckinForSocialProof(id, restaurant.name, pointsEarned);

      setImHerePointsEarned(pointsEarned);

      queryClient.invalidateQueries({ queryKey: rewardsQueryKeys.balance });
      queryClient.invalidateQueries({ queryKey: rewardsQueryKeys.history });
      queryClient.invalidateQueries({ queryKey: ['profileStats'] });
      queryClient.invalidateQueries({ queryKey: ['checkinCount'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      queryClient.invalidateQueries({ queryKey: ['voting', 'eligibility'] });
      queryClient.invalidateQueries({ queryKey: ['visits', userId] });

      requestReviewIfEligible('check_in');

      Alert.alert(
        `+${pointsEarned} Points Earned!`,
        `Welcome to ${restaurant.name}! You can now vote for them in the Vote Center.`,
        [{
          text: 'Sweet!',
          onPress: () => setShowLocationUpgrade(true),
        }]
      );
    } catch (err) {
      console.error('[RestaurantDetail] Error in handleImHere:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.', [{ text: 'OK' }]);
    } finally {
      setIsRecordingVisit(false);
    }
  }, [userId, id, restaurant, userLocation, recordVisit, isRecordingVisit, visitRecorded, refreshLocation, recordCheckinForSocialProof, queryClient]);

  // Build tabs dynamically — must be before early returns to respect hooks rules
  const hasFeatures = restaurant?.features && restaurant.features.length > 0;
  const recsGated = !hasRecommendationsAccess(tierName);

  const tabs: Tab[] = useMemo(() => {
    let baseTabs = getBaseTabs();

    // Apply owner display preferences (tab order + visibility)
    const prefs = restaurant?.display_preferences;
    if (prefs?.tabs && prefs.tabs.length > 0) {
      const prefMap = new Map(prefs.tabs.map((p: { key: string; hidden: boolean }) => [p.key, p]));

      // Filter hidden tabs — owner preference wins even if content exists
      baseTabs = baseTabs.filter(t => !prefMap.get(t.key)?.hidden);

      // Reorder per owner's saved order
      baseTabs = baseTabs.sort((a, b) => {
        const aIdx = prefs.tabs!.findIndex((p: { key: string }) => p.key === a.key);
        const bIdx = prefs.tabs!.findIndex((p: { key: string }) => p.key === b.key);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
    }

    if (recsGated) {
      baseTabs = baseTabs.filter(t => t.key !== 'recommendations');
    }
    // Pluralize "Menu" tab if restaurant has more than one menu
    baseTabs = baseTabs.map(t =>
      t.key === 'menu' ? { ...t, label: menus.length > 1 ? 'Menus' : 'Menu' } : t
    );
    if (hasFeatures) {
      return [...baseTabs, { key: 'features', label: 'Features' }];
    }
    return baseTabs;
  }, [hasFeatures, recsGated, menus.length, restaurant?.display_preferences]);

  // If the active tab was removed (e.g. recs gated), switch to first available tab
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs, activeTab]);

  // Must be called before any early returns (Rules of Hooks)
  const restaurantWeekIds = useRestaurantWeekIds();
  const coffeeTrailIds = useCoffeeChocolateTrailIds();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.errorText}>{error || 'Restaurant not found'}</Text>
        {error && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { setLoading(true); fetchRestaurantData(); }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const fullAddress = `${restaurant.address}, ${restaurant.city}, ${restaurant.state}${
    restaurant.zip_code ? ` ${restaurant.zip_code}` : ''
  }`;

  const isElite = tierName === 'elite';
  const heroHeight = isElite ? ELITE_HERO_HEIGHT : HERO_HEIGHT;
  const isRestaurantWeek = restaurantWeekIds.has(restaurant?.id ?? '');
  const isCoffeeTrail = coffeeTrailIds.has(restaurant?.id ?? '');

  // Check if we have featured content
  const hasHappyHours = happyHours.length > 0;
  const hasSpecials = specials.length > 0;
  const hasCoupons = coupons.length > 0;
  const hasEvents = events.length > 0;
  const hasFeaturedContent = hasHappyHours || hasSpecials || hasEvents || hasCoupons;

  const handleClaimCoupon = (couponId: string) => {
    requireEmailGate(async () => {
      setClaimingCouponId(couponId);
      try {
        await claimCoupon(couponId);
        // Mark as claimed locally and increment count — keeps the coupon visible
        setClaimedCouponIds(prev => new Set([...prev, couponId]));
        setCoupons(prev => prev.map(c =>
          c.id === couponId ? { ...c, claims_count: c.claims_count + 1 } : c
        ));
        Alert.alert('Coupon Claimed!', 'Go to My Coupons in your profile to use it at the restaurant.');
      } catch (err: any) {
        Alert.alert('Could not claim', err.message || 'Please try again.');
      } finally {
        setClaimingCouponId(null);
      }
    });
  };

  // Get today's hours
  const today = getCurrentDay();
  const sortedHours = [...hours].sort(
    (a, b) => DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
  );
  const todayHours = hours.find((h) => h.day_of_week === today);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Hero Section */}
        <View style={[styles.heroContainer, { height: heroHeight }]}>
          {restaurant.cover_image_url ? (
            <Image
              source={{ uri: restaurant.cover_image_url, cache: 'reload' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: colors.cardBgElevated, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="restaurant-outline" size={64} color={colors.textSecondary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.85)']}
            style={[styles.heroGradient, { height: heroHeight * 0.7 }]}
          >
            <View style={[styles.heroContent, isRestaurantWeek && { paddingRight: 84 }]}>
              {isElite && (
                <View style={styles.pickBadge}>
                  <Ionicons name="star" size={10} color="#FFF" />
                  <Text style={styles.pickBadgeText}>{brand.pickBadgeLabel}</Text>
                </View>
              )}
              <Text style={[styles.heroTitle, isElite && styles.heroTitleElite]}>{restaurant.name}</Text>
              {restaurant.categories && restaurant.categories.length > 0 && (
                <View style={styles.tagsContainer}>
                  {restaurant.categories.map((category) => (
                    <TagChip
                      key={category}
                      label={formatCategoryName(category)}
                      variant="default"
                    />
                  ))}
                  {restaurant.is_verified && (
                    <TagChip label="Verified" variant="success" />
                  )}
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Bookmark / Bucket List Button */}
          <TouchableOpacity
            style={styles.bookmarkButton}
            onPress={() => toggleWishlist(id)}
          >
            <Ionicons
              name={isWishlisted ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* Restaurant Week badge */}
          {isRestaurantWeek && (
            <View style={styles.rwBadge}>
              <RestaurantWeekBadge size={72} onPress={() => navigation.navigate('RestaurantWeek')} />
            </View>
          )}
          {/* Coffee & Chocolate Trail badge */}
          {isCoffeeTrail && !isRestaurantWeek && (
            <View style={styles.rwBadge}>
              <CoffeeChocolateTrailBadge size={72} onPress={() => navigation.navigate('CoffeeChocolateTrail')} />
            </View>
          )}
        </View>

        {/* Subtle gold divider for elite restaurants */}
        {isElite && <View style={styles.eliteDivider} />}

        {/* Info Bar */}
        <View style={[styles.infoBar, isElite && styles.infoBarElite]}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>{restaurant.address}, {restaurant.city}</Text>
          </View>
          <View style={styles.infoRow}>
            <OpenStatusBadge restaurantId={restaurant.id} size="default" />
            {todayHours && !todayHours.is_closed && todayHours.open_time && todayHours.close_time && (
              <Text style={styles.infoOpen}>
                {formatTime(todayHours.open_time)} - {formatTime(todayHours.close_time)}
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        <PersonalityDescription
          description={restaurant.custom_description || restaurant.description}
          name={restaurant.name}
        />

        {/* Photos Carousel */}
        {restaurant.photos && Array.isArray(restaurant.photos) && restaurant.photos.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <PhotosCarousel
              photos={restaurant.photos}
              restaurantName={restaurant.name}
            />
          </View>
        )}

        {/* Tab Bar */}
        <TabBar tabs={tabs} activeTab={activeTab} onTabPress={handleTabPress} />

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <View style={styles.tabSection}>
              <VideoRecommendationFeed
                restaurantId={id}
                restaurantName={restaurant.name}
                restaurantLogoUrl={restaurant.logo_url}
                restaurantCoverUrl={restaurant.cover_image_url}
              />
            </View>
          )}

          {/* Happy Hours Tab */}
          {activeTab === 'happy_hours' && (
            <View style={styles.tabSection}>
              {!hasHappyHourAccess(tierName) ? (
                <TierLockedEmptyState
                  featureName="Happy Hours"
                  restaurantName={restaurant.name}
                  restaurantId={restaurant.id}
                  tier={tierName}
                  icon="beer-outline"
                  itemCount={happyHours.length}
                  previewText={happyHours.length > 0 ? 'Special pricing on drinks & food' : undefined}
                  userId={userId}
                  categories={restaurant.categories}
                  cuisine={restaurant.cuisine}
                  marketId={marketId}
                  onAlternativePress={(altId) => navigation.navigate('RestaurantDetail', { id: altId })}
                />
              ) : happyHours.length > 0 ? (
                happyHours.map((hh) => (
                  <View key={hh.id} style={styles.contentCard}>
                    {hh.image_url && (
                      <Image
                        source={{ uri: hh.image_url }}
                        style={styles.contentImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.contentCardBody}>
                      <Text style={styles.contentTitle}>{hh.name}</Text>
                      <Text style={styles.contentTime}>
                        {formatTime(hh.start_time)} - {formatTime(hh.end_time)}
                      </Text>
                      <Text style={styles.contentDays}>
                        {hh.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                      </Text>
                      {hh.description && (
                        <Text style={styles.contentDescription}>{hh.description}</Text>
                      )}
                      {hh.items && hh.items.length > 0 && (
                        <View style={styles.itemsList}>
                          {hh.items.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              {item.discounted_price && (
                                <Text style={styles.itemPrice}>${item.discounted_price.toFixed(2)}</Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="beer-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No Happy Hours</Text>
                  <Text style={styles.emptySubtext}>This restaurant hasn't added happy hour deals yet</Text>
                </View>
              )}
            </View>
          )}

          {/* Specials Tab */}
          {activeTab === 'specials' && (
            <View style={styles.tabSection}>
              {!hasSpecialsAccess(tierName) ? (
                <TierLockedEmptyState
                  featureName="Specials"
                  restaurantName={restaurant.name}
                  restaurantId={restaurant.id}
                  tier={tierName}
                  icon="pricetag-outline"
                  itemCount={specials.length}
                  previewText={specials.length > 0 ? 'Daily deals and offers' : undefined}
                  userId={userId}
                  categories={restaurant.categories}
                  cuisine={restaurant.cuisine}
                  marketId={marketId}
                  onAlternativePress={(altId) => navigation.navigate('RestaurantDetail', { id: altId })}
                />
              ) : specials.length > 0 ? (
                specials.map((special) => (
                  <View key={special.id} style={styles.contentCard}>
                    {special.image_url && (
                      <Image
                        source={{ uri: special.image_url }}
                        style={styles.contentImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.contentCardBody}>
                      <Text style={styles.contentTitle}>{special.name}</Text>
                      {special.start_time && special.end_time && (
                        <Text style={styles.contentTime}>
                          {formatTime(special.start_time)} - {formatTime(special.end_time)}
                        </Text>
                      )}
                      {!special.start_time && !special.end_time && (
                        <Text style={styles.contentTime}>All Day</Text>
                      )}
                      {special.description && (
                        <Text style={styles.contentDescription}>{special.description}</Text>
                      )}
                      {special.original_price && special.special_price && (
                        <View style={styles.priceRow}>
                          <Text style={styles.originalPrice}>${special.original_price.toFixed(2)}</Text>
                          <Text style={styles.contentPrice}>${special.special_price.toFixed(2)}</Text>
                        </View>
                      )}
                      {!special.original_price && special.special_price && (
                        <Text style={styles.contentPrice}>${special.special_price.toFixed(2)}</Text>
                      )}
                      <Text style={styles.contentDays}>
                        {special.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No Specials</Text>
                  <Text style={styles.emptySubtext}>This restaurant hasn't added specials yet</Text>
                </View>
              )}
            </View>
          )}

          {/* Coupons Tab */}
          {activeTab === 'coupons' && (
            <View style={styles.tabSection}>
              {coupons.length > 0 ? (
                coupons.map((coupon) => (
                  <View key={coupon.id} style={[styles.contentCard, { borderWidth: 1, borderColor: colors.accent + '30', borderStyle: 'dashed' }]}>
                    {coupon.image_url && (
                      <Image
                        source={{ uri: coupon.image_url }}
                        style={styles.contentImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.contentCardBody}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={styles.contentTitle}>{coupon.title}</Text>
                        <View style={{ backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ color: colors.textOnAccent, fontSize: 13, fontWeight: '700' }}>
                            {formatDiscount(coupon)}
                          </Text>
                        </View>
                      </View>
                      {coupon.description && (
                        <Text style={styles.contentDescription}>{coupon.description}</Text>
                      )}
                      {coupon.days_of_week && coupon.days_of_week.length > 0 && (
                        <Text style={styles.contentDays}>
                          {coupon.days_of_week.length === 7 ? 'Every Day' :
                            coupon.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                        </Text>
                      )}
                      {coupon.max_claims_total && (
                        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                          {coupon.max_claims_total - coupon.claims_count} of {coupon.max_claims_total} remaining
                        </Text>
                      )}
                      <TouchableOpacity
                        style={{
                          marginTop: 12,
                          backgroundColor: claimedCouponIds.has(coupon.id) ? colors.cardBg : colors.accent,
                          paddingVertical: 10,
                          borderRadius: 8,
                          alignItems: 'center',
                          opacity: claimingCouponId === coupon.id ? 0.6 : 1,
                          borderWidth: claimedCouponIds.has(coupon.id) ? 1 : 0,
                          borderColor: colors.accent,
                        }}
                        onPress={() => !claimedCouponIds.has(coupon.id) && handleClaimCoupon(coupon.id)}
                        disabled={claimingCouponId === coupon.id || claimedCouponIds.has(coupon.id)}
                      >
                        <Text style={{
                          color: claimedCouponIds.has(coupon.id) ? colors.accent : colors.textOnAccent,
                          fontWeight: '600',
                          fontSize: 15,
                        }}>
                          {claimingCouponId === coupon.id ? 'Claiming...' : claimedCouponIds.has(coupon.id) ? 'Claimed ✓' : 'Claim Coupon'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="ticket-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No Coupons Yet</Text>
                  <Text style={styles.emptySubtext}>This restaurant hasn't added any deals yet — check back soon!</Text>
                </View>
              )}
            </View>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <View style={styles.tabSection}>
              {!hasEventsAccess(tierName) ? (
                <TierLockedEmptyState
                  featureName="Events"
                  restaurantName={restaurant.name}
                  restaurantId={restaurant.id}
                  tier={tierName}
                  icon="calendar-outline"
                  itemCount={events.length}
                  previewText={events.length > 0 ? 'Live music, trivia, and more' : undefined}
                  userId={userId}
                  categories={restaurant.categories}
                  cuisine={restaurant.cuisine}
                  marketId={marketId}
                  onAlternativePress={(altId) => navigation.navigate('RestaurantDetail', { id: altId })}
                />
              ) : events.length > 0 ? (
                events.map((event) => (
                  <View key={event.id} style={styles.contentCard}>
                    {event.image_url && (
                      <Image
                        source={{ uri: event.image_url }}
                        style={styles.contentImage}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.contentCardBody}>
                      <View style={styles.contentHeader}>
                        <Text style={styles.contentTitle}>{event.name}</Text>
                        <TagChip label={event.event_type.replace('_', ' ')} variant="info" />
                      </View>
                      {event.performer_name && (
                        <Text style={styles.contentPerformer}>{event.performer_name}</Text>
                      )}
                      <Text style={styles.contentTime}>
                        {formatTime(event.start_time)}
                        {event.end_time && ` - ${formatTime(event.end_time)}`}
                      </Text>
                      {event.is_recurring && (
                        <Text style={styles.contentDays}>
                          {event.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                        </Text>
                      )}
                      {event.cover_charge && (
                        <Text style={styles.contentPrice}>Cover: ${event.cover_charge}</Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textSecondary} />
                  <Text style={styles.emptyText}>No Events</Text>
                  <Text style={styles.emptySubtext}>This restaurant hasn't added events yet</Text>
                </View>
              )}
            </View>
          )}

          {/* Menu Tab */}
          {activeTab === 'menu' && (
            <View style={styles.tabSection}>
              {!hasMenuAccess(tierName) ? (
                <TierLockedEmptyState
                  featureName="Menu"
                  restaurantName={restaurant.name}
                  restaurantId={restaurant.id}
                  tier={tierName}
                  icon="restaurant-outline"
                  itemCount={menus.length}
                  previewText={menus.length > 0 ? 'Full menu with pricing' : undefined}
                  userId={userId}
                  categories={restaurant.categories}
                  cuisine={restaurant.cuisine}
                  marketId={marketId}
                  onAlternativePress={(altId) => navigation.navigate('RestaurantDetail', { id: altId })}
                />
              ) : (
                <MenuViewer
                  menuUrl={restaurant.menu_link}
                  restaurantName={restaurant.name}
                  menus={menus}
                  loading={menusLoading}
                />
              )}
            </View>
          )}

          {/* Features Tab */}
          {activeTab === 'features' && hasFeatures && (
            <View style={styles.tabSection}>
              <View style={styles.featuresGrid}>
                {restaurant.features!.map((feature: string) => (
                  <View key={feature} style={styles.featureChip}>
                    <Ionicons
                      name={getFeatureIconName(feature) as any}
                      size={14}
                      color={colors.accent}
                    />
                    <Text style={styles.featureChipText}>{formatFeatureName(feature)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Unified Info Panel */}
        <View style={styles.infoTabPanel}>
          {/* Tab strip */}
          <View style={styles.infoTabStrip}>
            {(['hours', 'contact', 'rate'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.infoTab, activeInfoTab === tab && styles.infoTabActive]}
                onPress={() => setActiveInfoTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.infoTabText, activeInfoTab === tab && styles.infoTabTextActive]}>
                  {tab === 'hours' ? 'Hours' : tab === 'contact' ? 'Contact' : 'Rate'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hours tab */}
          {activeInfoTab === 'hours' && (
            <View style={styles.infoTabContent}>
              {sortedHours.length > 0 ? sortedHours.map(({ day_of_week, open_time, close_time, is_closed }) => {
                const isToday = day_of_week === today;
                const dayLabel = day_of_week.charAt(0).toUpperCase() + day_of_week.slice(1);
                const timeStr = is_closed
                  ? 'Closed'
                  : open_time && close_time
                  ? `${formatTime(open_time)} – ${formatTime(close_time)}`
                  : 'Hours N/A';
                return (
                  <View key={day_of_week} style={[styles.hoursRow, isToday && styles.hoursTodayRow]}>
                    <Text style={[styles.hoursDayText, isToday && styles.hoursTodayText]}>{dayLabel}</Text>
                    <Text style={[styles.hoursTimeText, isToday && styles.hoursTodayText, is_closed && styles.hoursClosedText]}>{timeStr}</Text>
                  </View>
                );
              }) : (
                <Text style={styles.infoEmptyText}>Hours not available</Text>
              )}
            </View>
          )}

          {/* Contact tab */}
          {activeInfoTab === 'contact' && (
            <View style={styles.infoTabContent}>
              {restaurant.phone ? (
                <TouchableOpacity style={styles.contactRow} onPress={() => { trackClick('phone', restaurant.id); Linking.openURL(`tel:${restaurant.phone!.replace(/[^0-9+]/g, '')}`); }}>
                  <View style={styles.contactIcon}><Ionicons name="call-outline" size={20} color={colors.text} /></View>
                  <View style={styles.contactRowBody}>
                    <Text style={styles.contactRowLabel}>Call</Text>
                    <Text style={styles.contactRowValue}>{restaurant.phone}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
              {restaurant.website ? (
                <TouchableOpacity style={styles.contactRow} onPress={() => {
                  trackClick('website', restaurant.id);
                  let url = restaurant.website!;
                  if (!url.startsWith('http')) url = `https://${url}`;
                  navigation.navigate('InAppBrowser', { url, title: restaurant.name });
                }}>
                  <View style={styles.contactIcon}><Ionicons name="globe-outline" size={20} color={colors.text} /></View>
                  <View style={styles.contactRowBody}>
                    <Text style={styles.contactRowLabel}>Website</Text>
                    <Text style={styles.contactRowValue} numberOfLines={1}>{restaurant.website}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.contactRow} onPress={() => {
                trackClick('directions', restaurant.id);
                const dest = restaurant.latitude && restaurant.longitude
                  ? `${restaurant.latitude},${restaurant.longitude}`
                  : encodeURIComponent(fullAddress);
                const url = Platform.select({
                  ios: `maps:?daddr=${dest}`,
                  android: `google.navigation:q=${dest}`,
                  default: `https://maps.google.com/maps?daddr=${dest}`,
                });
                Linking.openURL(url!);
              }}>
                <View style={styles.contactIcon}><Ionicons name="navigate-outline" size={20} color={colors.text} /></View>
                <View style={styles.contactRowBody}>
                  <Text style={styles.contactRowLabel}>Directions</Text>
                  <Text style={styles.contactRowValue} numberOfLines={1}>{fullAddress}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.contactRow} onPress={handleFavoritePress}>
                <View style={styles.contactIcon}><Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={20} color={isFavorite ? colors.accent : colors.text} /></View>
                <View style={styles.contactRowBody}>
                  <Text style={styles.contactRowLabel}>{isFavorite ? 'Saved' : 'Save'}</Text>
                  <Text style={styles.contactRowValue}>{isFavorite ? 'In your favorites' : 'Add to favorites'}</Text>
                </View>
                {isFavorite && <Ionicons name="checkmark" size={16} color={colors.accent} />}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.contactRow, styles.contactRowLast]} onPress={async () => {
                trackClick('share', restaurant.id);
                const appUrl = brand.appStoreUrl || brand.playStoreUrl || '';
                await Share.share({ message: `Check out ${restaurant.name} on ${brand.appName}! ${appUrl}` });
              }}>
                <View style={styles.contactIcon}><Ionicons name="share-outline" size={20} color={colors.text} /></View>
                <View style={styles.contactRowBody}>
                  <Text style={styles.contactRowLabel}>Share</Text>
                  <Text style={styles.contactRowValue}>Tell a friend</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Rate tab */}
          {activeInfoTab === 'rate' && (
            <View style={styles.infoTabContent}>
              {userId ? (
                <RatingSubmit restaurantId={restaurant.id} onRatingSubmitted={() => fetchRestaurantData()} />
              ) : (
                <Text style={styles.infoEmptyText}>Sign in to rate this restaurant</Text>
              )}
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating "I'm Here" Button */}
      {userId && (
        <TouchableOpacity
          style={[
            styles.imHereFab,
            visitRecorded && styles.imHereFabRecorded,
          ]}
          onPress={handleImHere}
          activeOpacity={0.9}
          disabled={isRecordingVisit || visitRecorded}
        >
          {isRecordingVisit ? (
            <ActivityIndicator size="small" color={colors.textOnAccent} />
          ) : (
            <>
              <Ionicons
                name={visitRecorded ? 'checkmark-circle' : 'gift'}
                size={22}
                color={visitRecorded ? colors.success : colors.textOnAccent}
              />
              <Text style={styles.imHereFabText}>
                {visitRecorded ? `+${imHerePointsEarned} pts` : "I'm Here"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Floating Recommend Button — hidden for basic tier restaurants */}
      {userId && !recsGated && (
        <TouchableOpacity
          style={styles.recommendFab}
          onPress={() => navigation.navigate('VideoRecommendCapture', {
            restaurantId: id,
            restaurantName: restaurant.name,
          })}
          activeOpacity={0.9}
        >
          <Ionicons name="videocam" size={22} color={colors.text} />
          <Text style={styles.recommendFabText}>Recommend</Text>
        </TouchableOpacity>
      )}

      {showLocationUpgrade && <LocationUpgradePrompt />}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  scrollView: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: colors.primary },
  errorText: { marginTop: 16, fontSize: 16, color: colors.textMuted, textAlign: 'center' as const, paddingHorizontal: 32 },
  retryButton: { marginTop: 20, paddingHorizontal: 32, paddingVertical: 12, backgroundColor: colors.accent, borderRadius: 24 },
  retryButtonText: { fontSize: 16, fontWeight: '600' as const, color: colors.textOnAccent },
  heroContainer: { width: SCREEN_WIDTH },
  heroImage: { width: '100%' as const, height: '100%' as const },
  backButton: { position: 'absolute' as const, top: 50, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const, zIndex: 10 },
  bookmarkButton: { position: 'absolute' as const, top: 50, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' as const, alignItems: 'center' as const, zIndex: 10 },
  rwBadge: { position: 'absolute' as const, bottom: 16, right: 16, zIndex: 10 },
  heroGradient: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, justifyContent: 'flex-end' as const, paddingHorizontal: 16, paddingBottom: 16 },
  heroContent: { alignItems: 'flex-start' as const },
  tagsContainer: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 6, marginTop: 8 },
  heroTitle: { fontSize: 32, fontWeight: '700' as const, color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  pickBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1, borderColor: colors.goldBorder, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm, marginBottom: 8 },
  pickBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.3 },
  heroTitleElite: { textShadowColor: 'rgba(255, 215, 0, 0.15)' },
  eliteDivider: { height: 1, backgroundColor: colors.goldBorder, marginHorizontal: 16 },
  infoBarElite: { paddingVertical: 16 },
  infoBar: { paddingHorizontal: 16, paddingVertical: 12 },
  infoRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  infoText: { fontSize: 14, color: colors.textMuted },
  infoOpen: { fontSize: 13, color: '#4ade80', marginTop: 4, fontWeight: '500' as const },
  ratingRow: { paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.text, marginBottom: 12, paddingHorizontal: 16 },
  sectionContent: { paddingHorizontal: 16 },
  tabContent: { minHeight: 200 },
  tabSection: { padding: 16 },
  contentCard: { backgroundColor: colors.cardBg, borderRadius: radius.md, overflow: 'hidden' as const, marginBottom: 12 },
  contentCardBody: { padding: 16 },
  contentImage: { width: '100%' as const, height: 160 },
  contentHeader: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, marginBottom: 8 },
  contentTitle: { fontSize: 16, fontWeight: '600' as const, color: colors.text, marginBottom: 4, flex: 1 },
  contentTime: { fontSize: 14, color: colors.gold, marginBottom: 4 },
  contentDays: { fontSize: 13, color: colors.textSecondary },
  contentDescription: { fontSize: 14, color: colors.textMuted, marginBottom: 4 },
  contentPrice: { fontSize: 15, fontWeight: '600' as const, color: colors.accent, marginTop: 4 },
  priceRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, marginTop: 4 },
  originalPrice: { fontSize: 14, color: colors.textSecondary, textDecorationLine: 'line-through' as const },
  contentPerformer: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' as const, marginBottom: 4 },
  itemsList: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  itemRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 4 },
  itemName: { fontSize: 14, color: colors.text },
  itemPrice: { fontSize: 14, fontWeight: '600' as const, color: colors.accent },
  emptyState: { padding: 40, alignItems: 'center' as const, justifyContent: 'center' as const },
  emptyText: { fontSize: 18, fontWeight: '600' as const, color: colors.textMuted, marginTop: 16 },
  emptySubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' as const },
  featuresGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8 },
  featureChip: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.cardBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, gap: 5, borderWidth: 1, borderColor: colors.border },
  featureChipText: { fontSize: 12, fontWeight: '500' as const, color: colors.textMuted },
  photosSection: { marginBottom: 24 },
  infoTabPanel: { marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.cardBg, borderRadius: radius.md, overflow: 'hidden' as const },
  infoTabStrip: { flexDirection: 'row' as const, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoTab: { flex: 1, paddingVertical: 12, alignItems: 'center' as const },
  infoTabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  infoTabText: { fontSize: 13, fontWeight: '500' as const, color: colors.textMuted },
  infoTabTextActive: { color: colors.accent, fontWeight: '600' as const },
  infoTabContent: { padding: 16 },
  infoEmptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' as const, paddingVertical: 12 },
  hoursRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, paddingVertical: 7, marginHorizontal: -16, paddingHorizontal: 16 },
  hoursTodayRow: { backgroundColor: colors.cardBgElevated },
  hoursDayText: { fontSize: 14, color: colors.text },
  hoursTimeText: { fontSize: 14, color: colors.textMuted },
  hoursTodayText: { fontWeight: '600' as const, color: colors.text },
  hoursClosedText: { color: colors.error },
  contactRow: { flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  contactRowLast: { borderBottomWidth: 0 },
  contactIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.cardBgElevated, justifyContent: 'center' as const, alignItems: 'center' as const },
  contactRowBody: { flex: 1 },
  contactRowLabel: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
  contactRowValue: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  bottomSpacer: { height: 120 },
  recommendFab: { position: 'absolute' as const, bottom: 80, right: 16, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.cardBgElevated, paddingVertical: 12, paddingHorizontal: 16, borderRadius: radius.full, borderWidth: 1, borderColor: colors.accent, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, gap: 6 },
  recommendFabText: { color: colors.text, fontSize: 14, fontWeight: '600' as const },
  imHereFab: { position: 'absolute' as const, bottom: 24, right: 16, flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: colors.accent, paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.full, shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8, gap: 8 },
  imHereFabRecorded: { backgroundColor: `${colors.success}30`, shadowColor: colors.success },
  imHereFabText: { color: colors.textOnAccent, fontSize: 16, fontWeight: '600' as const },
}));
