import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { fetchEvents, ApiEvent, getEventVenueName } from '../lib/events';
import { colors, spacing } from '../constants/colors';
import EventFlyerCard from '../components/EventFlyerCard';
import SearchBar from '../components/SearchBar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FLYER_HEIGHT = SCREEN_HEIGHT * 0.75;

interface DateSection {
  title: string;
  displayTitle: string;
  data: ApiEvent[];
}

async function getAllEvents(): Promise<ApiEvent[]> {
  const events = await fetchEvents();

  // Filter to upcoming/recurring events
  const today = new Date().toISOString().split('T')[0];
  return events.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= today) return true;
    return false;
  });
}

function formatDateHeader(dateString: string): string {
  if (dateString === 'recurring') return 'Weekly Events';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function groupEventsByDate(events: ApiEvent[]): DateSection[] {
  const groups: Record<string, ApiEvent[]> = {};
  const recurringEvents: ApiEvent[] = [];

  events.forEach((event) => {
    if (event.is_recurring) {
      recurringEvents.push(event);
    } else if (event.event_date) {
      const dateKey = event.event_date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
    }
  });

  // Sort dates chronologically
  const sortedDates = Object.keys(groups).sort();
  const sections: DateSection[] = sortedDates.map((date) => ({
    title: date,
    displayTitle: formatDateHeader(date),
    data: groups[date],
  }));

  // Add recurring events at the end
  if (recurringEvents.length > 0) {
    sections.push({
      title: 'recurring',
      displayTitle: 'Weekly Events',
      data: recurringEvents,
    });
  }

  return sections;
}

interface DateEventCarouselProps {
  events: ApiEvent[];
  onEventPress: (event: ApiEvent) => void;
  onRestaurantPress: (restaurantId: string) => void;
  onArtistPress: (artistSlug: string) => void;
}

function DateEventCarousel({ events, onEventPress, onRestaurantPress, onArtistPress }: DateEventCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentIndex(Math.max(0, Math.min(newIndex, events.length - 1)));
    },
    [events.length]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const renderFlyer = useCallback(
    ({ item }: { item: ApiEvent }) => (
      <EventFlyerCard
        event={item}
        width={SCREEN_WIDTH}
        height={FLYER_HEIGHT}
        onPress={() => onEventPress(item)}
        onRestaurantPress={
          item.restaurant?.id
            ? () => onRestaurantPress(item.restaurant!.id)
            : undefined
        }
        onArtistPress={
          item.self_promoter?.slug
            ? () => onArtistPress(item.self_promoter!.slug)
            : undefined
        }
      />
    ),
    [onEventPress, onRestaurantPress, onArtistPress]
  );

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        data={events}
        renderItem={renderFlyer}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={getItemLayout}
      />

      {/* Pagination dots */}
      {events.length > 1 && (
        <View style={styles.paginationContainer}>
          {events.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export default function EventsViewAllScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['allEvents'],
    queryFn: getAllEvents,
    staleTime: 5 * 60 * 1000,
  });

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const query = searchQuery.toLowerCase();
    return events.filter((event) =>
      event.name.toLowerCase().includes(query) ||
      (event.performer_name && event.performer_name.toLowerCase().includes(query)) ||
      (getEventVenueName(event) && getEventVenueName(event)!.toLowerCase().includes(query))
    );
  }, [events, searchQuery]);

  const sections = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  const handleEventPress = useCallback(
    (event: ApiEvent) => {
      navigation.navigate('EventDetail', { event });
    },
    [navigation]
  );

  const handleRestaurantPress = useCallback(
    (restaurantId: string) => {
      navigation.navigate('RestaurantDetail', { id: restaurantId });
    },
    [navigation]
  );

  const handleArtistPress = useCallback(
    (artistId: string, artistName: string) => {
      navigation.navigate('ArtistDetail', { artistId, artistName });
    },
    [navigation]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (events.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>No events found</Text>
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 && searchQuery.trim() ? (
          <View style={styles.noResultsContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.noResultsText}>No events match your search</Text>
          </View>
        ) : (
          sections.map((section) => (
            <View key={section.title} style={styles.section}>
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{section.displayTitle}</Text>
                {section.data.length > 1 && (
                  <Text style={styles.eventCount}>
                    {section.data.length} events
                  </Text>
                )}
              </View>

              {/* Horizontal Event Carousel */}
              <DateEventCarousel
                events={section.data}
                onEventPress={handleEventPress}
                onRestaurantPress={handleRestaurantPress}
                onArtistPress={handleArtistPress}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.textMuted,
  },
  noResultsContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dateHeaderText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  eventCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  carouselContainer: {
    height: FLYER_HEIGHT + 40, // Extra space for dots
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
