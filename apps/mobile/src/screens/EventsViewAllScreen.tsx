import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
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
const FLYER_WIDTH = SCREEN_WIDTH - 32; // Leave padding on sides to peek next card
const FLYER_HEIGHT = SCREEN_HEIGHT * 0.6; // Reduced to fit better on screen

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
  onArtistPress: (artistId: string, artistName: string) => void;
}

function DateEventCarousel({ events, onEventPress, onRestaurantPress, onArtistPress }: DateEventCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const CARD_WIDTH = FLYER_WIDTH + spacing.md; // Card width plus gap

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / CARD_WIDTH);
      setCurrentIndex(Math.max(0, Math.min(newIndex, events.length - 1)));
    },
    [events.length, CARD_WIDTH]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_WIDTH,
      offset: CARD_WIDTH * index,
      index,
    }),
    [CARD_WIDTH]
  );

  const renderFlyer = useCallback(
    ({ item, index }: { item: ApiEvent; index: number }) => (
      <View style={{
        width: CARD_WIDTH,
        paddingLeft: index === 0 ? spacing.md : 0,
        paddingRight: spacing.md,
      }}>
        <EventFlyerCard
          event={item}
          width={FLYER_WIDTH}
          height={FLYER_HEIGHT}
          onPress={() => onEventPress(item)}
          onRestaurantPress={
            item.restaurant?.id
              ? () => onRestaurantPress(item.restaurant!.id)
              : undefined
          }
          onArtistPress={
            item.self_promoter?.id
              ? () => onArtistPress(item.self_promoter!.id, item.self_promoter!.name)
              : undefined
          }
        />
      </View>
    ),
    [onEventPress, onRestaurantPress, onArtistPress, CARD_WIDTH]
  );

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        data={events}
        renderItem={renderFlyer}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={getItemLayout}
      />

      {/* Swipe hint and pagination */}
      {events.length > 1 && (
        <View style={styles.paginationContainer}>
          <View style={styles.swipeHint}>
            <Ionicons name="chevron-back" size={14} color={colors.textMuted} />
            <Text style={styles.swipeHintText}>Swipe for more</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </View>
          <View style={styles.dotsRow}>
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

      {/* Scroll hint at top when there are multiple dates */}
      {sections.length > 1 && (
        <View style={styles.scrollHintTop}>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          <Text style={styles.scrollHintText}>
            {sections.length} dates with events • Scroll to see all
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
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
  scrollHintTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  scrollHintText: {
    fontSize: 13,
    color: colors.textMuted,
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
    height: FLYER_HEIGHT + 70, // Extra space for swipe hint and dots
  },
  paginationContainer: {
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
