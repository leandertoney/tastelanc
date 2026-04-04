import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { EventType } from '../types/database';
import { fetchEntertainmentEvents, ApiEvent, getEventVenueName } from '../lib/events';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import SpotifyStyleListItem from '../components/SpotifyStyleListItem';
import SearchBar from '../components/SearchBar';
import EntertainmentFilterModal from '../components/EntertainmentFilterModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  live_music: 'Live Music',
  dj: 'DJ',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  bingo: 'Bingo',
  music_bingo: 'Music Bingo',
  poker: 'Poker',
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
  music_bingo: 'musical-notes',
  poker: 'diamond',
  other: 'calendar',
  promotion: 'megaphone',
};

async function getAllEntertainmentEvents(marketId?: string | null): Promise<ApiEvent[]> {
  const events = await fetchEntertainmentEvents(marketId);
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
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>([]);
  const [tfkOnly, setTfkOnly] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['allEntertainmentEvents', marketId],
    queryFn: () => getAllEntertainmentEvents(marketId),
    staleTime: 5 * 60 * 1000,
  });

  // Count events per type for badges
  const typeCounts = useMemo(() => {
    const counts: Partial<Record<EventType, number>> = {};
    for (const event of events) {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    }
    return counts;
  }, [events]);

  // Count TFK partner events
  const tfkCount = useMemo(
    () => events.filter((e) => e.partner_slug === 'thirsty-for-knowledge').length,
    [events]
  );

  // Filter events by selected types, TFK partner flag, and search query, then sort chronologically
  const filteredEvents = useMemo(() => {
    let filtered: typeof events;

    if (tfkOnly) {
      // TFK filter overrides event-type filters — show only TFK partner events
      filtered = events.filter((e) => e.partner_slug === 'thirsty-for-knowledge');
    } else if (selectedTypes.length > 0) {
      filtered = events.filter((e) => selectedTypes.includes(e.event_type));
    } else {
      filtered = events;
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((e) =>
        e.name.toLowerCase().includes(query) ||
        (e.performer_name && e.performer_name.toLowerCase().includes(query)) ||
        (getEventVenueName(e) && getEventVenueName(e)!.toLowerCase().includes(query))
      );
    }

    // Sort chronologically by start time
    filtered.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

    return filtered;
  }, [events, selectedTypes, tfkOnly, searchQuery]);

  const handlePress = useCallback(
    (event: ApiEvent) => {
      navigation.navigate('EventDetail', { event });
    },
    [navigation]
  );

  const handleToggleType = useCallback((type: EventType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const handleToggleTFK = useCallback(() => {
    setTfkOnly((prev) => !prev);
  }, []);

  const renderItem = ({ item }: { item: ApiEvent }) => {
    const imageUrl = item.image_url;
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
    <>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Search Bar with filter icon */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events or performers..."
            filterCount={selectedTypes.length + (tfkOnly ? 1 : 0)}
            onFilterPress={() => setFilterVisible(true)}
          />
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
            {tfkOnly
              ? ' \u00B7 Thirsty for Knowledge'
              : selectedTypes.length > 0
              ? ` \u00B7 ${selectedTypes.length} filter${selectedTypes.length !== 1 ? 's' : ''}`
              : null}
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
                {selectedTypes.length > 0
                  ? 'No events found for the selected filters'
                  : 'No entertainment events scheduled'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      <EntertainmentFilterModal
        visible={filterVisible}
        selectedTypes={selectedTypes}
        typeCounts={typeCounts}
        onToggle={handleToggleType}
        onClear={() => setSelectedTypes([])}
        onClose={() => setFilterVisible(false)}
        tfkOnly={tfkOnly}
        tfkCount={tfkCount}
        onToggleTFK={handleToggleTFK}
      />
    </>
  );
}

const useStyles = createLazyStyles((colors) => ({
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
  resultsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
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
}));
