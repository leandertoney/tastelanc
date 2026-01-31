import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  TouchableOpacity,
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
import { supabase } from '../lib/supabase';
import { fetchEvents } from '../lib/events';
import { trackScreenView } from '../lib/analytics';
import { useAuth } from '../hooks/useAuth';
import { useFavorites, useToggleFavorite } from '../hooks';
import {
  TagChip,
  RatingStars,
  QuickActionsBar,
  SectionCard,
  MenuViewer,
  MapPreview,
  CheckInModal,
  PhotosCarousel,
  RatingSubmit,
  PersonalityDescription,
  TabBar,
} from '../components';
import type { Tab } from '../components';
import { formatCategoryName, formatTime } from '../lib/formatters';
import { colors, radius } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 320;

// No placeholder images - only show actual restaurant images

// Day abbreviations for hours display
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// Get current day of week
const getCurrentDay = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

// Tab configuration
const TABS: Tab[] = [
  { key: 'happy_hours', label: 'Happy Hours' },
  { key: 'specials', label: 'Specials' },
  { key: 'events', label: 'Events' },
  { key: 'menu', label: 'Menu' },
];

export default function RestaurantDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { userId } = useAuth();

  // Use hooks for favorites - handles signup modal automatically
  const { data: favorites = [] } = useFavorites();
  const toggleFavoriteMutation = useToggleFavorite();
  const isFavorite = favorites.includes(id);

  const [restaurant, setRestaurant] = useState<RestaurantWithTier | null>(null);
  const [hours, setHours] = useState<RestaurantHours[]>([]);
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [menusLoading, setMenusLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('happy_hours');

  const fetchRestaurantData = useCallback(async () => {
    try {
      setError(null);

      // Fetch restaurant details first
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
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

      // Set restaurant (no tier filtering - show all content)
      setRestaurant({ ...restaurantData, tiers: null });

      // Fetch related data in parallel
      const [hoursRes, happyHoursRes, specialsRes, eventsData, menusRes] = await Promise.all([
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
      ]);

      if (hoursRes.data) setHours(hoursRes.data);
      if (happyHoursRes.data) setHappyHours(happyHoursRes.data);
      if (specialsRes.data) setSpecials(specialsRes.data);
      if (menusRes.data) setMenus(menusRes.data as Menu[]);
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
    }
  }, [restaurant, id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  // Handle favorite press - the hook handles signup modal automatically
  const handleFavoritePress = useCallback(() => {
    toggleFavoriteMutation.mutate(id);
  }, [id, toggleFavoriteMutation]);

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
      </View>
    );
  }

  const fullAddress = `${restaurant.address}, ${restaurant.city}, ${restaurant.state}${
    restaurant.zip_code ? ` ${restaurant.zip_code}` : ''
  }`;

  // Check if we have featured content
  const hasHappyHours = happyHours.length > 0;
  const hasSpecials = specials.length > 0;
  const hasEvents = events.length > 0;
  const hasFeaturedContent = hasHappyHours || hasSpecials || hasEvents;

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
        <View style={styles.heroContainer}>
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
            colors={['transparent', 'rgba(0,0,0,0.4)', colors.primary]}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>{restaurant.name}</Text>
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
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Info Bar */}
        <View style={styles.infoBar}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color={colors.textMuted} />
            <Text style={styles.infoText}>{restaurant.address}, {restaurant.city}</Text>
          </View>
          {todayHours && !todayHours.is_closed && (
            <Text style={styles.infoOpen}>
              Open {formatTime(todayHours.open_time)} - {formatTime(todayHours.close_time)}
            </Text>
          )}
        </View>

        {/* Description */}
        <PersonalityDescription
          description={restaurant.description}
          name={restaurant.name}
        />

        {/* Tab Bar */}
        <TabBar tabs={TABS} activeTab={activeTab} onTabPress={setActiveTab} />

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Happy Hours Tab */}
          {activeTab === 'happy_hours' && (
            <View style={styles.tabSection}>
              {happyHours.length > 0 ? (
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
              {specials.length > 0 ? (
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

          {/* Events Tab */}
          {activeTab === 'events' && (
            <View style={styles.tabSection}>
              {events.length > 0 ? (
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
              <MenuViewer
                menuUrl={restaurant.menu_link}
                restaurantName={restaurant.name}
                menus={menus}
                loading={menusLoading}
              />
            </View>
          )}
        </View>

        {/* Photos */}
        {restaurant.photos && restaurant.photos.length > 0 && (
          <View style={styles.photosSection}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <PhotosCarousel
              photos={restaurant.photos}
              restaurantName={restaurant.name}
            />
          </View>
        )}

        {/* Hours */}
        {sortedHours.length > 0 && (
          <View style={styles.hoursSection}>
            <Text style={styles.sectionTitle}>Hours</Text>
            <View style={styles.hoursGrid}>
              {sortedHours.map((h) => (
                <View key={h.id} style={styles.hoursRow}>
                  <Text style={[styles.hoursDay, h.day_of_week === today && styles.hoursTodayText]}>
                    {h.day_of_week.charAt(0).toUpperCase() + h.day_of_week.slice(1, 3)}
                  </Text>
                  <Text style={[styles.hoursTime, h.day_of_week === today && styles.hoursTodayText]}>
                    {h.is_closed ? 'Closed' : `${formatTime(h.open_time)} - ${formatTime(h.close_time)}`}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Rating */}
        {userId && (
          <View style={styles.ratingSection}>
            <RatingSubmit
              restaurantId={restaurant.id}
              onRatingSubmitted={() => {
                fetchRestaurantData();
              }}
            />
          </View>
        )}

        {/* Location */}
        <View style={styles.locationSection}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.sectionContent}>
            <MapPreview
              latitude={restaurant.latitude}
              longitude={restaurant.longitude}
              address={fullAddress}
              name={restaurant.name}
            />
          </View>
        </View>

        {/* Quick Actions - Now at bottom */}
        <View style={styles.actionsSection}>
          <QuickActionsBar
            restaurantId={restaurant.id}
            restaurantName={restaurant.name}
            phone={restaurant.phone}
            website={restaurant.website}
            latitude={restaurant.latitude}
            longitude={restaurant.longitude}
            address={fullAddress}
            onFavoritePress={handleFavoritePress}
            isFavorite={isFavorite}
          />
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Floating Check-In Button */}
      <TouchableOpacity
        style={styles.checkInFab}
        onPress={() => setCheckInModalVisible(true)}
        activeOpacity={0.9}
      >
        <Ionicons name="gift" size={24} color={colors.text} />
        <Text style={styles.checkInFabText}>Check In</Text>
      </TouchableOpacity>

      {/* Check-In Modal */}
      <CheckInModal
        visible={checkInModalVisible}
        onClose={() => setCheckInModalVisible(false)}
        restaurantId={id}
        restaurantName={restaurant.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },

  // Hero styles
  heroContainer: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.7,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Info Bar
  infoBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoOpen: {
    fontSize: 13,
    color: '#4ade80',
    marginTop: 4,
    fontWeight: '500',
  },

  // Rating
  ratingSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Section titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionContent: {
    paddingHorizontal: 16,
  },

  // Tab content
  tabContent: {
    minHeight: 200,
  },
  tabSection: {
    padding: 16,
  },
  contentCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: 12,
  },
  contentCardBody: {
    padding: 16,
  },
  contentImage: {
    width: '100%',
    height: 160,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    flex: 1,
  },
  contentTime: {
    fontSize: 14,
    color: colors.gold,
    marginBottom: 4,
  },
  contentDays: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  contentDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  contentPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  contentPerformer: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  itemsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: colors.text,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },

  // Photos section
  photosSection: {
    marginBottom: 24,
  },

  // Hours section
  hoursSection: {
    marginBottom: 24,
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  hoursRow: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingRight: 16,
  },
  hoursDay: {
    fontSize: 14,
    color: colors.textMuted,
  },
  hoursTime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  hoursTodayText: {
    color: colors.text,
    fontWeight: '600',
  },

  // Location section
  locationSection: {
    marginBottom: 24,
  },

  // Actions section
  actionsSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  bottomSpacer: {
    height: 100,
  },
  checkInFab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.full,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    gap: 8,
  },
  checkInFabText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
