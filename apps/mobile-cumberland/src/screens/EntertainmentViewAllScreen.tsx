import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { EventType } from '../types/database';
import { fetchEntertainmentEvents, ApiEvent, ENTERTAINMENT_TYPES, getEventVenueName } from '../lib/events';
import { colors, radius, spacing } from '../constants/colors';
import { useMarket } from '../context/MarketContext';
import SpotifyStyleListItem from '../components/SpotifyStyleListItem';
import SearchBar from '../components/SearchBar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  live_music: 'Live Music',
  dj: 'DJ',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  bingo: 'Bingo',
  other: 'Other',
  promotion: 'Promo',
};

const EVENT_TYPE_ICONS: Record<EventType, keyof typeof Ionicons.glyphMap> = {
  live_music: 'musical-notes',
  dj: 'disc',
  trivia: 'help-circle',
  karaoke: 'mic',
  comedy: 'happy',
  sports: 'football',
  bingo: 'grid',
  other: 'calendar',
  promotion: 'megaphone',
};

async function getAllEntertainmentEvents(): Promise<ApiEvent[]> {
  const events = await fetchEntertainmentEvents();
  const todayDate = new Date().toISOString().split('T')[0];

  // Filter to upcoming/recurring events
  return events.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  });
}

function formatEventTime(startTime: string, endTime: string | null): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };

  if (endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

function formatEventDate(dateString: string | null, isRecurring: boolean): string {
  if (isRecurring) return 'Weekly';
  if (!dateString) return '';

  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Today';
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function EntertainmentViewAllScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['allEntertainmentEvents', marketId],
    queryFn: getAllEntertainmentEvents,
    staleTime: 5 * 60 * 1000,
  });

  // Filter events by selected type and search query, then sort chronologically by start time
  const filteredEvents = useMemo(() => {
    let filtered = selectedType ? events.filter((e) => e.event_type === selectedType) : events;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(query) ||
        (e.performer_name && e.performer_name.toLowerCase().includes(query)) ||
        (getEventVenueName(e) && getEventVenueName(e)!.toLowerCase().includes(query))
      );
    }

    // Sort chronologically by start time (hard requirement)
    filtered.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    return filtered;
  }, [events, selectedType, searchQuery]);

  const handlePress = useCallback(
    (event: ApiEvent) => {
      navigation.navigate('EventDetail', { event });
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: ApiEvent }) => {
    const imageUrl = item.image_url; // API always provides image_url
    const venueName = getEventVenueName(item) || 'City-wide Event';
    const timeDisplay = formatEventTime(item.start_time, item.end_time);
    const dateDisplay = formatEventDate(item.event_date ?? null, item.is_recurring);
    const typeLabel = EVENT_TYPE_LABELS[item.event_type];
    const icon = EVENT_TYPE_ICONS[item.event_type] || 'calendar';

    return (
      <SpotifyStyleListItem
        imageUrl={imageUrl}
        title={item.name}
        subtitle={`${venueName} \u00B7 ${timeDisplay}`}
        detail={`${dateDisplay} \u00B7 ${typeLabel}`}
        onPress={() => handlePress(item)}
        fallbackIcon={icon}
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
          placeholder="Search events or performers..."
        />
      </View>

      {/* Type Filter - Icon Pills */}
      <View style={styles.filterContainer}>
        {ENTERTAINMENT_TYPES.map((type) => {
          const isSelected = selectedType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, isSelected && styles.filterChipActive]}
              onPress={() => setSelectedType(isSelected ? null : type)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={EVENT_TYPE_ICONS[type]}
                size={16}
                color={isSelected ? colors.text : colors.textMuted}
              />
              <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                {EVENT_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          {selectedType && ` \u00B7 ${EVENT_TYPE_LABELS[selectedType]}`}
        </Text>
      </View>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Entertainment</Text>
            <Text style={styles.emptyText}>
              {selectedType
                ? `No ${EVENT_TYPE_LABELS[selectedType].toLowerCase()} events found`
                : 'No entertainment events scheduled'}
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
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
  },
  resultsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  resultsText: {
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
