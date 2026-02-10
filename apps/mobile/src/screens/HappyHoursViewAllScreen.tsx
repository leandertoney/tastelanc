import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { HappyHour, HappyHourItem, Restaurant, DayOfWeek, Tier } from '../types/database';
import { supabase } from '../lib/supabase';
import { tieredFairRotate, getTierName } from '../lib/fairRotation';
import { colors, radius, spacing } from '../constants/colors';
import SpotifyStyleListItem from '../components/SpotifyStyleListItem';
import SearchBar from '../components/SearchBar';
import { trackImpression } from '../lib/impressions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface HappyHourWithRestaurant extends HappyHour {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cover_image_url'> & {
    tiers: Pick<Tier, 'name'> | null;
  };
  items?: HappyHourItem[];
}

// Day tabs configuration
const DAY_TABS: { day: DayOfWeek; label: string }[] = [
  { day: 'sunday', label: 'S' },
  { day: 'monday', label: 'M' },
  { day: 'tuesday', label: 'T' },
  { day: 'wednesday', label: 'W' },
  { day: 'thursday', label: 'T' },
  { day: 'friday', label: 'F' },
  { day: 'saturday', label: 'S' },
];

// Get current day of week
function getCurrentDay(): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

async function getAllHappyHours(): Promise<HappyHourWithRestaurant[]> {
  // Get all active happy hours with tier data
  const { data, error } = await supabase
    .from('happy_hours')
    .select(`
      *,
      restaurant:restaurants!inner(id, name, cover_image_url, tier_id, tiers(name)),
      items:happy_hour_items(*)
    `)
    .eq('is_active', true);

  if (error) {
    console.warn('getAllHappyHours query failed:', error.message);
    return [];
  }

  // Apply tiered fair rotation: Elite first, Premium second, Basic third
  return tieredFairRotate(
    data || [],
    (hh) => getTierName({ restaurant: hh.restaurant }),
  );
}

function formatTimeWindow(startTime: string, endTime: string): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function formatDays(days: string[]): string {
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Mon-Fri';
  if (days.length === 2 && days.includes('saturday') && days.includes('sunday')) return 'Weekends';
  return days.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
}

export default function HappyHoursViewAllScreen() {
  const navigation = useNavigation<NavigationProp>();
  // Default to current day
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(getCurrentDay());
  const [searchQuery, setSearchQuery] = useState('');

  const { data: happyHours = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['allHappyHours'],
    queryFn: getAllHappyHours,
    staleTime: 5 * 60 * 1000,
  });

  // Filter by selected day and search query
  const filteredHappyHours = useMemo(() => {
    let filtered = happyHours.filter((hh) => hh.days_of_week.includes(selectedDay));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((hh) =>
        hh.restaurant.name.toLowerCase().includes(query) ||
        hh.name.toLowerCase().includes(query) ||
        hh.items?.some(item => item.name.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [happyHours, selectedDay, searchQuery]);

  const handlePress = useCallback(
    (restaurantId: string) => {
      navigation.navigate('RestaurantDetail', { id: restaurantId });
    },
    [navigation]
  );

  // Track impressions when items become visible
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as HappyHourWithRestaurant;
      if (item?.restaurant?.id) {
        trackImpression(item.restaurant.id, 'happy_hours_view_all', token.index ?? 0);
      }
    }
  }).current;

  const renderItem = ({ item }: { item: HappyHourWithRestaurant }) => {
    const firstItem = item.items?.[0];
    const dealText = firstItem
      ? (firstItem.discounted_price ? `$${firstItem.discounted_price} ${firstItem.name}` : firstItem.name)
      : item.name;

    return (
      <SpotifyStyleListItem
        imageUrl={item.restaurant.cover_image_url}
        title={item.restaurant.name}
        accentText={dealText}
        subtitle={`${formatTimeWindow(item.start_time, item.end_time)} \u00B7 ${formatDays(item.days_of_week)}`}
        onPress={() => handlePress(item.restaurant.id)}
        fallbackIcon="beer"
      />
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search restaurants or deals..."
        />
      </View>

      {/* Day Tabs */}
      <View style={styles.tabsContainer}>
        {DAY_TABS.map(({ day, label }) => {
          const isSelected = selectedDay === day;
          const isToday = getCurrentDay() === day;

          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.tab,
                isSelected && styles.tabSelected,
              ]}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isSelected && styles.tabTextSelected,
                ]}
              >
                {label}
              </Text>
              {isToday && !isSelected && <View style={styles.todayDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day Label */}
      <View style={styles.dayLabelContainer}>
        <Text style={styles.dayLabel}>
          {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
        </Text>
        <Text style={styles.resultCount}>
          {filteredHappyHours.length} {filteredHappyHours.length === 1 ? 'happy hour' : 'happy hours'}
        </Text>
      </View>

      {/* Happy Hours List */}
      <FlatList
        data={filteredHappyHours}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="beer-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Happy Hours</Text>
            <Text style={styles.emptyText}>
              No happy hours on {selectedDay}. Try another day!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 8,
    justifyContent: 'space-between',
  },
  tab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
  },
  tabSelected: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextSelected: {
    color: colors.text,
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  dayLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  dayLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  resultCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
