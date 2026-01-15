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
} from '../types/database';
import { supabase } from '../lib/supabase';
import { fetchEvents } from '../lib/events';
import { isFavorited, toggleFavorite } from '../lib/favorites';
import { formatCategoryName } from '../lib/formatters';
import { useAuth } from '../hooks/useAuth';
import {
  TagChip,
  RatingStars,
  QuickActionsBar,
  SectionCard,
  HoursAccordion,
  TabBar,
  MenuViewer,
  MapPreview,
  CheckInModal,
  PhotosCarousel,
  RatingSubmit,
} from '../components';
import type { Tab } from '../components';
import { colors, radius } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'RestaurantDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 280;

// No placeholder images - only show actual restaurant images

// Tab configuration
const TABS: Tab[] = [
  { key: 'menu', label: 'Menu' },
  { key: 'happy_hour', label: 'Happy Hour' },
  { key: 'specials', label: 'Specials' },
  { key: 'events', label: 'Events' },
];

export default function RestaurantDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const { userId } = useAuth();

  const [restaurant, setRestaurant] = useState<RestaurantWithTier | null>(null);
  const [hours, setHours] = useState<RestaurantHours[]>([]);
  const [happyHours, setHappyHours] = useState<HappyHour[]>([]);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);

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

      // Update navigation title
      navigation.setOptions({ title: restaurantData.name });

      // Fetch related data in parallel
      const [hoursRes, happyHoursRes, specialsRes, eventsData] = await Promise.all([
        supabase.from('restaurant_hours').select('*').eq('restaurant_id', id),
        supabase.from('happy_hours').select('*, happy_hour_items(*)').eq('restaurant_id', id).eq('is_active', true),
        supabase.from('specials').select('*').eq('restaurant_id', id).eq('is_active', true),
        fetchEvents({ restaurant_id: id }),
      ]);

      if (hoursRes.data) setHours(hoursRes.data);
      if (happyHoursRes.data) setHappyHours(happyHoursRes.data);
      if (specialsRes.data) setSpecials(specialsRes.data);
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

  // Load favorite status on mount
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      if (!userId) return;
      const favorited = await isFavorited(userId, id);
      setIsFavorite(favorited);
    };
    loadFavoriteStatus();
  }, [id, userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRestaurantData();
  }, [fetchRestaurantData]);

  const handleFavoritePress = useCallback(async () => {
    if (!userId) return;
    const newState = await toggleFavorite(userId, id);
    setIsFavorite(newState);
  }, [id, userId]);

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

  // Show all content for all restaurants (no tier filtering)
  const hasPremiumContent = true;

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
          colors={['transparent', colors.primary]}
          style={styles.heroGradient}
        >
          <View style={styles.heroContent}>
            {restaurant.logo_url && (
              <Image
                source={{ uri: restaurant.logo_url, cache: 'reload' }}
                style={styles.logo}
                resizeMode="contain"
              />
            )}
            <Text style={styles.heroTitle}>{restaurant.name}</Text>
            <View style={styles.heroMeta}>
              {restaurant.tastelancrating ? (
                <View style={styles.ratingsRow}>
                  <RatingStars
                    rating={restaurant.tastelancrating}
                    reviewCount={restaurant.tastelancrating_count}
                    size="medium"
                  />
                  {restaurant.average_rating && (
                    <Text style={styles.googleRating}>
                      {restaurant.average_rating.toFixed(1)} Google
                    </Text>
                  )}
                </View>
              ) : restaurant.average_rating ? (
                <View style={styles.ratingsRow}>
                  <RatingStars rating={restaurant.average_rating} size="medium" />
                  <Text style={styles.googleLabel}>Google</Text>
                </View>
              ) : null}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Category Tags */}
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

      {/* Quick Actions */}
      <QuickActionsBar
        phone={restaurant.phone}
        website={restaurant.website}
        latitude={restaurant.latitude}
        longitude={restaurant.longitude}
        address={fullAddress}
        onFavoritePress={handleFavoritePress}
        isFavorite={isFavorite}
      />

      {/* Rating Section */}
      {userId && (
        <View style={styles.ratingSection}>
          <RatingSubmit
            restaurantId={restaurant.id}
            onRatingSubmitted={() => {
              loadData();
            }}
          />
        </View>
      )}

      {/* Tab Bar - only for Premium/Elite restaurants */}
      {hasPremiumContent && (
        <TabBar tabs={TABS} activeTab={activeTab} onTabPress={setActiveTab} />
      )}

      {/* Basic Info - shown for all restaurants OR as Menu tab for Premium/Elite */}
      {(!hasPremiumContent || activeTab === 'menu') && (
        <View style={styles.tabContent}>
          {/* About Section */}
          {restaurant.description && (
            <SectionCard title="About" icon="information-circle-outline">
              <Text style={styles.descriptionText}>{restaurant.description}</Text>
            </SectionCard>
          )}

          {/* Photos Section */}
          {restaurant.photos && restaurant.photos.length > 0 && (
            <SectionCard title="Photos" icon="images-outline">
              <PhotosCarousel
                photos={restaurant.photos}
                restaurantName={restaurant.name}
              />
            </SectionCard>
          )}

          {/* Hours Section */}
          {hours.length > 0 && (
            <SectionCard title="Hours" icon="time-outline">
              <HoursAccordion hours={hours} />
            </SectionCard>
          )}

          {/* Location Section */}
          <SectionCard title="Location" icon="location-outline">
            <MapPreview
              latitude={restaurant.latitude}
              longitude={restaurant.longitude}
              address={fullAddress}
              name={restaurant.name}
            />
          </SectionCard>

          {/* Menu Section - only for Premium/Elite */}
          {hasPremiumContent && (
            <SectionCard title="Menu" icon="restaurant-outline">
              <MenuViewer
                menuUrl={restaurant.menu_link}
                restaurantName={restaurant.name}
              />
            </SectionCard>
          )}
        </View>
      )}

      {hasPremiumContent && activeTab === 'happy_hour' && (
        <View style={styles.tabContent}>
          {happyHours.length > 0 ? (
            <SectionCard title="Happy Hour" icon="beer-outline">
              {happyHours.map((hh) => (
                <View key={hh.id} style={styles.happyHourItem}>
                  <Text style={styles.happyHourName}>{hh.name}</Text>
                  <Text style={styles.happyHourTime}>
                    {hh.start_time} - {hh.end_time}
                  </Text>
                  <Text style={styles.happyHourDays}>
                    {hh.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                  </Text>
                  {hh.items && hh.items.length > 0 && (
                    <View style={styles.happyHourItems}>
                      {hh.items.map((item) => (
                        <View key={item.id} style={styles.dealRow}>
                          <Text style={styles.dealName}>{item.name}</Text>
                          {item.discounted_price && <Text style={styles.dealPrice}>${item.discounted_price.toFixed(2)}</Text>}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </SectionCard>
          ) : (
            <View style={styles.emptyTabContainer}>
              <Ionicons name="beer-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.placeholderText}>No Happy Hour</Text>
              <Text style={styles.placeholderSubtext}>
                This restaurant hasn't added happy hour deals yet
              </Text>
            </View>
          )}
        </View>
      )}

      {hasPremiumContent && activeTab === 'specials' && (
        <View style={styles.tabContent}>
          {specials.length > 0 ? (
            <SectionCard title="Specials" icon="pricetag-outline">
              {specials.map((special) => (
                <View key={special.id} style={styles.specialItem}>
                  <Text style={styles.specialName}>{special.name}</Text>
                  {special.description && (
                    <Text style={styles.specialDescription}>{special.description}</Text>
                  )}
                  {special.special_price && (
                    <Text style={styles.specialPrice}>${special.special_price.toFixed(2)}</Text>
                  )}
                  <Text style={styles.specialDays}>
                    {special.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                  </Text>
                </View>
              ))}
            </SectionCard>
          ) : (
            <View style={styles.emptyTabContainer}>
              <Ionicons name="pricetag-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.placeholderText}>No Specials</Text>
              <Text style={styles.placeholderSubtext}>
                This restaurant hasn't added specials yet
              </Text>
            </View>
          )}
        </View>
      )}

      {hasPremiumContent && activeTab === 'events' && (
        <View style={styles.tabContent}>
          {events.length > 0 ? (
            <SectionCard title="Events & Entertainment" icon="musical-notes-outline">
              {events.map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <TagChip label={event.event_type.replace('_', ' ')} variant="info" />
                  </View>
                  {event.performer_name && (
                    <Text style={styles.eventPerformer}>{event.performer_name}</Text>
                  )}
                  <Text style={styles.eventTime}>
                    {event.start_time}
                    {event.end_time && ` - ${event.end_time}`}
                  </Text>
                  {event.is_recurring && (
                    <Text style={styles.eventDays}>
                      {event.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                    </Text>
                  )}
                  {event.cover_charge && (
                    <Text style={styles.eventCover}>Cover: ${event.cover_charge}</Text>
                  )}
                </View>
              ))}
            </SectionCard>
          ) : (
            <View style={styles.emptyTabContainer}>
              <Ionicons name="musical-notes-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.placeholderText}>No Events</Text>
              <Text style={styles.placeholderSubtext}>
                This restaurant hasn't added events yet
              </Text>
            </View>
          )}
        </View>
      )}

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
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.6,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroContent: {
    alignItems: 'flex-start',
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardBg,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  googleRating: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  googleLabel: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 4,
  },
  ratingSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.primaryLight,
  },

  // Description
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },

  // Happy Hour
  happyHourItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  happyHourName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  happyHourTime: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  happyHourDays: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  happyHourItems: {
    marginTop: 8,
  },
  dealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dealName: {
    fontSize: 14,
    color: colors.text,
  },
  dealPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },

  // Specials
  specialItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  specialName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  specialDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  specialPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 4,
  },
  specialDays: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // Events
  eventItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  eventPerformer: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 2,
  },
  eventDays: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  eventCover: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent,
  },

  // Location
  addressText: {
    fontSize: 15,
    color: colors.textMuted,
    lineHeight: 22,
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

  // Tab content
  tabContent: {
    flex: 1,
  },
  emptyTabContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBg,
    margin: 16,
    borderRadius: radius.md,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 16,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});
