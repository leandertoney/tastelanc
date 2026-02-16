/**
 * Itinerary Builder Screen
 * Main screen for the "Plan Your Day" feature
 * Users pick a date, select mood preferences, and generate a time-sequenced itinerary
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { Restaurant, RestaurantHours, HappyHour } from '../types/database';
import type { ApiEvent } from '../lib/events';
import type { TimeSlot, ItineraryItemWithReason, ItineraryMood } from '../types/itinerary';
import { ITINERARY_MOODS, ALL_TIME_SLOTS } from '../types/itinerary';
import { generateItinerary, getAlternativesForSlot, type GenerateItineraryParams } from '../lib/itineraryGenerator';
import { useSaveItinerary } from '../hooks/useItineraries';
import { useFavorites, useUserLocation } from '../hooks';
import { getUserPreferences } from '../lib/recommendations';
import { fetchEvents } from '../lib/events';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, typography } from '../constants/colors';
import ItineraryTimeline from '../components/ItineraryTimeline';
import type { OnboardingData } from '../types/onboarding';
import { useMarket } from '../context/MarketContext';
import { BRAND } from '../config/brand';

type Props = NativeStackScreenProps<RootStackParamList, 'ItineraryBuilder'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Date helpers ───────────────────────────────────────────────

function getNextDays(count: number): { label: string; dateStr: string; isToday: boolean }[] {
  const days: { label: string; dateStr: string; isToday: boolean }[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });

    days.push({
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${dayName} ${month} ${dayNum}`,
      dateStr: d.toISOString().split('T')[0],
      isToday: i === 0,
    });
  }

  return days;
}

// ─── Data fetching hooks ────────────────────────────────────────

function useAllRestaurants(marketId: string | null) {
  return useQuery<Restaurant[]>({
    queryKey: ['itinerary', 'allRestaurants', marketId],
    queryFn: async () => {
      let query = supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .limit(200);
      if (marketId) {
        query = query.eq('market_id', marketId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('useAllRestaurants query failed:', error.message);
        return [];
      }
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useAllRestaurantHours(marketId: string | null) {
  return useQuery<Record<string, RestaurantHours[]>>({
    queryKey: ['itinerary', 'allHours', marketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_hours')
        .select('*');
      if (error) {
        console.warn('useAllRestaurantHours query failed:', error.message);
        return {};
      }

      // Group by restaurant_id
      const grouped: Record<string, RestaurantHours[]> = {};
      for (const row of data || []) {
        if (!grouped[row.restaurant_id]) {
          grouped[row.restaurant_id] = [];
        }
        grouped[row.restaurant_id].push(row);
      }
      return grouped;
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useAllHappyHours(marketId: string | null) {
  return useQuery<HappyHour[]>({
    queryKey: ['itinerary', 'allHappyHours', marketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('happy_hours')
        .select('*')
        .eq('is_active', true);
      if (error) {
        console.warn('useAllHappyHours query failed:', error.message);
        return [];
      }
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useAllEvents(marketId: string | null) {
  return useQuery<ApiEvent[]>({
    queryKey: ['itinerary', 'allEvents', marketId],
    queryFn: () => fetchEvents({ paid_only: false, limit: 100 }),
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Component ──────────────────────────────────────────────────

export default function ItineraryBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<Props['route']>();

  // State
  const [selectedDate, setSelectedDate] = useState(
    route.params?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedMood, setSelectedMood] = useState<ItineraryMood | null>(null);
  const [items, setItems] = useState<ItineraryItemWithReason[]>([]);
  const [skippedSlots, setSkippedSlots] = useState<TimeSlot[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preferences, setPreferences] = useState<OnboardingData | null>(null);

  // Market context
  const { marketId } = useMarket();

  // Data queries
  const { data: restaurants = [], isLoading: loadingRestaurants } = useAllRestaurants(marketId);
  const { data: allHours = {}, isLoading: loadingHours } = useAllRestaurantHours(marketId);
  const { data: allHappyHours = [], isLoading: loadingHappyHours } = useAllHappyHours(marketId);
  const { data: allEvents = [], isLoading: loadingEvents } = useAllEvents(marketId);
  const { data: favorites = [] } = useFavorites();
  const { location: userLocation } = useUserLocation();

  const isLoadingData = loadingRestaurants || loadingHours || loadingHappyHours || loadingEvents;

  const saveItineraryMutation = useSaveItinerary();

  const datePills = useMemo(() => getNextDays(7), []);

  // Load user preferences on mount
  useEffect(() => {
    getUserPreferences().then(setPreferences);
  }, []);

  // Build generator params
  const generatorParams = useMemo((): GenerateItineraryParams => ({
    date: selectedDate,
    mood: selectedMood,
    preferences,
    userLocation,
    favorites,
    restaurants,
    allHours,
    allHappyHours,
    allEvents,
  }), [selectedDate, selectedMood, preferences, userLocation, favorites, restaurants, allHours, allHappyHours, allEvents]);

  // ─── Handlers ───────────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    // Run async-like with a brief delay for visual feedback
    setTimeout(() => {
      const result = generateItinerary(generatorParams);
      setItems(result.items);
      setSkippedSlots(result.skippedSlots);
      setHasGenerated(true);
      setIsGenerating(false);
    }, 300);
  }, [generatorParams]);

  const handleItemPress = useCallback((item: ItineraryItemWithReason) => {
    if (item.restaurant_id) {
      navigation.navigate('RestaurantDetail', { id: item.restaurant_id });
    }
  }, [navigation]);

  const handleSwapItem = useCallback((item: ItineraryItemWithReason) => {
    const usedIds = new Set(items.map(i => i.restaurant_id).filter(Boolean) as string[]);
    const alternatives = getAlternativesForSlot(
      generatorParams,
      item.time_slot as TimeSlot,
      usedIds,
      3,
    );

    if (alternatives.length === 0) {
      Alert.alert('No alternatives', 'No other restaurants are available for this time slot.');
      return;
    }

    // Show picker with alternatives
    Alert.alert(
      'How about trying...',
      alternatives.map((alt, i) => `${i + 1}. ${alt.restaurant.name} — ${alt.reason}`).join('\n'),
      [
        ...alternatives.map((alt, i) => ({
          text: alt.restaurant.name,
          onPress: () => {
            setItems(prev => prev.map(prevItem => {
              if (prevItem.id !== item.id) return prevItem;
              return {
                ...prevItem,
                restaurant_id: alt.restaurant.id,
                display_name: alt.restaurant.name,
                display_address: alt.restaurant.address,
                display_latitude: alt.restaurant.latitude,
                display_longitude: alt.restaurant.longitude,
                display_image_url: alt.restaurant.cover_image_url || alt.restaurant.logo_url,
                reason: alt.reason,
              };
            }));
          },
        })),
        { text: 'Keep current', style: 'cancel' },
      ],
    );
  }, [items, generatorParams]);

  const handleRemoveItem = useCallback((item: ItineraryItemWithReason) => {
    setItems(prev => prev.filter(i => i.id !== item.id));
    setSkippedSlots(prev => [...prev, item.time_slot as TimeSlot]);
  }, []);

  const handleSave = useCallback(async () => {
    if (items.length === 0) return;

    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dateLabel = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    try {
      await saveItineraryMutation.mutateAsync({
        itinerary: {
          title: `${BRAND.cityName} ${selectedMood ? ITINERARY_MOODS[selectedMood].label : 'Day'} — ${dateLabel}`,
          date: selectedDate,
          is_generated: true,
        },
        items,
      });

      Alert.alert(
        'Itinerary Saved!',
        `Your day plan has been saved. Have a great time in ${BRAND.cityName}!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save itinerary. Please try again.');
    }
  }, [items, selectedDate, selectedMood, saveItineraryMutation, navigation]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="map" size={28} color={colors.accent} />
          <Text style={styles.headerTitle}>Plan Your Day</Text>
          <Text style={styles.headerSubtitle}>
            What are you in the mood for today?
          </Text>
        </View>

        {/* Date picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datePickerContent}
          style={styles.datePicker}
        >
          {datePills.map(day => (
            <TouchableOpacity
              key={day.dateStr}
              style={[
                styles.datePill,
                selectedDate === day.dateStr && styles.datePillSelected,
              ]}
              onPress={() => {
                setSelectedDate(day.dateStr);
                if (hasGenerated) {
                  setHasGenerated(false);
                  setItems([]);
                  setSkippedSlots([]);
                }
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.datePillText,
                  selectedDate === day.dateStr && styles.datePillTextSelected,
                ]}
              >
                {day.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Mood chips */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>I'm looking for...</Text>
          <View style={styles.moodGrid}>
            {(Object.entries(ITINERARY_MOODS) as [ItineraryMood, typeof ITINERARY_MOODS[ItineraryMood]][]).map(
              ([key, mood]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.moodChip,
                    selectedMood === key && styles.moodChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedMood(prev => prev === key ? null : key);
                    if (hasGenerated) {
                      setHasGenerated(false);
                      setItems([]);
                      setSkippedSlots([]);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mood.icon as any}
                    size={18}
                    color={selectedMood === key ? colors.text : colors.textMuted}
                  />
                  <View>
                    <Text
                      style={[
                        styles.moodLabel,
                        selectedMood === key && styles.moodLabelSelected,
                      ]}
                    >
                      {mood.label}
                    </Text>
                    <Text style={styles.moodDesc}>{mood.description}</Text>
                  </View>
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>

        {/* Generate button */}
        {!hasGenerated && (
          <View style={styles.generateSection}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                (isLoadingData || isGenerating) && styles.generateButtonDisabled,
              ]}
              onPress={handleGenerate}
              activeOpacity={0.8}
              disabled={isLoadingData || isGenerating}
            >
              {isGenerating || isLoadingData ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="sparkles" size={20} color={colors.text} />
              )}
              <Text style={styles.generateButtonText}>
                {isLoadingData
                  ? 'Loading restaurant data...'
                  : isGenerating
                  ? 'Building your perfect day...'
                  : 'Generate My Day'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Timeline */}
        {hasGenerated && (
          <>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>{`Your Day in ${BRAND.cityName}`}</Text>
              <TouchableOpacity
                onPress={() => {
                  setHasGenerated(false);
                  setItems([]);
                  setSkippedSlots([]);
                }}
              >
                <Text style={styles.regenerateText}>Regenerate</Text>
              </TouchableOpacity>
            </View>

            <ItineraryTimeline
              items={items}
              skippedSlots={skippedSlots}
              onItemPress={handleItemPress}
              onSwapItem={handleSwapItem}
              onRemoveItem={handleRemoveItem}
              showEmptySlots={true}
            />

            {/* Save button */}
            {items.length > 0 && (
              <View style={styles.saveSection}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSave}
                  activeOpacity={0.8}
                  disabled={saveItineraryMutation.isPending}
                >
                  {saveItineraryMutation.isPending ? (
                    <ActivityIndicator size="small" color={colors.text} />
                  ) : (
                    <Ionicons name="bookmark" size={18} color={colors.text} />
                  )}
                  <Text style={styles.saveButtonText}>
                    {saveItineraryMutation.isPending ? 'Saving...' : 'Save Itinerary'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.title1,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  // Date picker
  datePicker: {
    marginBottom: spacing.lg,
  },
  datePickerContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  datePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  datePillText: {
    fontSize: typography.subhead,
    fontWeight: '500',
    color: colors.textMuted,
  },
  datePillTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  // Section
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  // Mood chips
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    width: '48%' as any,
  },
  moodChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.goldLight,
  },
  moodLabel: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.textMuted,
  },
  moodLabelSelected: {
    color: colors.text,
  },
  moodDesc: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
  },
  // Generate button
  generateSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
  },
  // Timeline header
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  timelineTitle: {
    fontSize: typography.title3,
    fontWeight: '700',
    color: colors.text,
  },
  regenerateText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.accent,
  },
  // Save
  saveSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
  },
  saveButtonText: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
  },
});
