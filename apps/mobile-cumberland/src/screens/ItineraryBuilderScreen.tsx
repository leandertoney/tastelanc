/**
 * Itinerary Builder Screen
 * Branded builder for the "What's the Move?" feature.
 * Matches the ItineraryCardScreen's visual language — card container
 * with accent border, logo, and cohesive form sections.
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
  Image,
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
import { ITINERARY_MOODS } from '../types/itinerary';
import { generateItinerary, type GenerateItineraryParams } from '../lib/itineraryGenerator';
import { useFavorites, useUserLocation } from '../hooks';
import { getUserPreferences } from '../lib/recommendations';
import { fetchEvents } from '../lib/events';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing, typography } from '../constants/colors';
import type { OnboardingData } from '../types/onboarding';
import { useMarket } from '../context/MarketContext';

const logo = require('../../assets/tastelanc_1a1a1a.png');

type Props = NativeStackScreenProps<RootStackParamList, 'ItineraryBuilder'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Date helpers ───────────────────────────────────────────────

function getNextDays(count: number): { label: string; dateStr: string }[] {
  const days: { label: string; dateStr: string }[] = [];
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

  const [selectedDate, setSelectedDate] = useState(
    route.params?.date || new Date().toISOString().split('T')[0]
  );
  const [selectedMood, setSelectedMood] = useState<ItineraryMood | null>(null);
  const [stopCount, setStopCount] = useState<2 | 3>(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [preferences, setPreferences] = useState<OnboardingData | null>(null);

  const { marketId } = useMarket();

  const { data: restaurants = [], isLoading: loadingRestaurants } = useAllRestaurants(marketId);
  const { data: allHours = {}, isLoading: loadingHours } = useAllRestaurantHours(marketId);
  const { data: allHappyHours = [], isLoading: loadingHappyHours } = useAllHappyHours(marketId);
  const { data: allEvents = [], isLoading: loadingEvents } = useAllEvents(marketId);
  const { data: favorites = [] } = useFavorites();
  const { location: userLocation } = useUserLocation();

  const { data: voteCountsRaw } = useQuery<Map<string, number>>({
    queryKey: ['itinerary', 'voteCounts'],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from('votes')
        .select('restaurant_id')
        .eq('month', currentMonth);
      if (error || !data) return new Map();
      const tally = new Map<string, number>();
      for (const v of data) {
        tally.set(v.restaurant_id, (tally.get(v.restaurant_id) || 0) + 1);
      }
      return tally;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoadingData = loadingRestaurants || loadingHours || loadingHappyHours || loadingEvents;
  const datePills = useMemo(() => getNextDays(7), []);

  useEffect(() => {
    getUserPreferences().then(setPreferences);
  }, []);

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
    restaurantVoteCounts: voteCountsRaw,
    stopCount,
  }), [selectedDate, selectedMood, preferences, userLocation, favorites, restaurants, allHours, allHappyHours, allEvents, voteCountsRaw, stopCount]);

  const handleGenerate = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const result = generateItinerary(generatorParams);
      setIsGenerating(false);

      if (result.items.length > 0) {
        navigation.navigate('ItineraryCard', {
          items: result.items,
          walkMinutes: result.walkMinutes,
          mood: selectedMood,
          date: selectedDate,
          stopCount,
        });
      } else {
        Alert.alert(
          'No Results',
          'We couldn\'t find enough restaurants for your selections. Try a different vibe or date.',
        );
      }
    }, 300);
  }, [generatorParams, navigation, selectedMood, selectedDate, stopCount]);

  // ─── Render ─────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Card — fills the screen */}
      <View style={styles.card}>
        {/* Logo */}
        <Image source={logo} style={styles.logo} resizeMode="contain" />

        {/* Header */}
        <Text style={styles.title}>Plan Your Perfect Day</Text>
        <Text style={styles.subtitle}>Pick a day, set the vibe.</Text>

        {/* ── When ─────────────────────────────────────────── */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.sectionLabel}>When</Text>
          <View style={styles.dividerLine} />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {datePills.map(day => (
            <TouchableOpacity
              key={day.dateStr}
              style={[
                styles.datePill,
                selectedDate === day.dateStr && styles.datePillSelected,
              ]}
              onPress={() => setSelectedDate(day.dateStr)}
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

        {/* ── What's the vibe? ─────────────────────────────── */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.sectionLabel}>Vibe</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.moodGrid}>
          {(Object.entries(ITINERARY_MOODS) as [ItineraryMood, typeof ITINERARY_MOODS[ItineraryMood]][]).map(
            ([key, mood]) => {
              const isSelected = selectedMood === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.moodChip, isSelected && styles.moodChipSelected]}
                  onPress={() => setSelectedMood(prev => prev === key ? null : key)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={mood.icon as any}
                    size={15}
                    color={isSelected ? colors.text : colors.textMuted}
                  />
                  <Text style={[styles.moodText, isSelected && styles.moodTextSelected]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </View>

        {/* ── How many stops? ──────────────────────────────── */}
        <View style={styles.sectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.sectionLabel}>Stops</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.stopRow}>
          <TouchableOpacity
            style={[styles.stopPill, stopCount === 2 && styles.stopPillSelected]}
            onPress={() => setStopCount(2)}
            activeOpacity={0.7}
          >
            <Text style={[styles.stopText, stopCount === 2 && styles.stopTextSelected]}>
              2 — Quick outing
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stopPill, stopCount === 3 && styles.stopPillSelected]}
            onPress={() => setStopCount(3)}
            activeOpacity={0.7}
          >
            <Text style={[styles.stopText, stopCount === 3 && styles.stopTextSelected]}>
              3 — Full experience
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CTA Button — below the card */}
      <View style={styles.buttonWrapper}>
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
            <ActivityIndicator size="small" color={colors.textOnAccent} />
          ) : (
            <Ionicons name="sparkles" size={20} color={colors.textOnAccent} />
          )}
          <Text style={styles.generateButtonText}>
            {isLoadingData
              ? 'Loading...'
              : isGenerating
              ? 'Building your plan...'
              : 'Build My Plan'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  // ─── Card Container (matches ItineraryCardScreen) ─────────
  card: {
    flex: 1,
    marginHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    // Depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    // Accent border
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ─── Logo ──────────────────────────────────────────────────
  logo: {
    width: 120,
    height: 40,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },

  // ─── Header ────────────────────────────────────────────────
  title: {
    fontSize: typography.title1,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.callout,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // ─── Section Dividers ──────────────────────────────────────
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  sectionLabel: {
    fontSize: typography.caption1,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginHorizontal: spacing.sm + 4,
  },

  // ─── Date Pills ────────────────────────────────────────────
  dateRow: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  datePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.cardBg,
    marginRight: 8,
    alignSelf: 'center',
  },
  datePillSelected: {
    backgroundColor: colors.accent,
  },
  datePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  datePillTextSelected: {
    color: colors.textOnAccent,
  },

  // ─── Mood Grid ─────────────────────────────────────────────
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '48%' as any,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moodChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.goldLight,
  },
  moodText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.textMuted,
  },
  moodTextSelected: {
    color: colors.text,
  },

  // ─── Stop Count ────────────────────────────────────────────
  stopRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stopPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopPillSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.goldLight,
  },
  stopText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.textMuted,
  },
  stopTextSelected: {
    color: colors.text,
  },

  // ─── Generate Button ──────────────────────────────────────
  buttonWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
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
    color: colors.textOnAccent,
  },
});
