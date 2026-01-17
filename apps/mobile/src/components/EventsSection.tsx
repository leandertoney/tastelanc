import { useCallback } from 'react';
import { View, StyleSheet, FlatList, ImageSourcePropType } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EventCard, { EVENT_CARD_HEIGHT } from './EventCard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { fetchNonEntertainmentEvents, ApiEvent } from '../lib/events';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_EVENTS } from '../config/mockData';
import { usePlatformSocialProof } from '../hooks';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Event data used for rendering the cards in the carousel
interface DisplayEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  isCityWide: boolean;
  venue?: string;
  description?: string;
  imageUrl?: string;
  imageSource?: ImageSourcePropType;
  restaurantId?: string;
  originalEvent?: ApiEvent; // Keep reference to original event for navigation
}

// Convert centralized mock data to DisplayEvent format
const MOCK_DISPLAY_EVENTS: DisplayEvent[] = MOCK_EVENTS.map((e) => ({
  id: e.id,
  name: e.name,
  date: e.date,
  time: e.time,
  venue: e.venue,
  isCityWide: e.isCityWide,
  imageUrl: e.imageUrl,
  restaurantId: e.restaurantId,
}));

async function getUpcomingEvents(): Promise<ApiEvent[]> {
  const events = await fetchNonEntertainmentEvents();

  // Filter to upcoming/recurring events and limit to 10
  const today = new Date().toISOString().split('T')[0];
  return events
    .filter(event => {
      if (event.is_recurring) return true;
      if (event.event_date && event.event_date >= today) return true;
      return false;
    })
    .slice(0, 10);
}

function formatEventDate(event: ApiEvent): string {
  if (event.is_recurring) {
    const days = event.days_of_week;
    if (days.length === 1) {
      return `Every ${days[0].charAt(0).toUpperCase() + days[0].slice(1)}`;
    }
    return 'Weekly';
  }

  if (event.event_date) {
    const date = new Date(event.event_date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return 'Upcoming';
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
    return `${formatTime(startTime)}-${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

export default function EventsSection() {
  const navigation = useNavigation<NavigationProp>();
  const { data: socialProof } = usePlatformSocialProof();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: getUpcomingEvents,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleEventPress = useCallback(
    (event: ApiEvent) => {
      navigation.navigate('EventDetail', { event });
    },
    [navigation]
  );

  // Map API events to display format
  const mappedEvents: DisplayEvent[] = events.map((event) => ({
    id: event.id,
    name: event.name,
    date: formatEventDate(event),
    time: formatEventTime(event.start_time, event.end_time),
    venue: event.restaurant?.name,
    imageUrl: event.image_url, // API always provides image_url
    isCityWide: !event.restaurant,
    restaurantId: event.restaurant?.id,
    originalEvent: event, // Keep original for EventDetail navigation
  }));

  // Use real events, or mock events if enabled and no real data
  const displayData = events.length > 0 ? mappedEvents : ENABLE_MOCK_DATA ? MOCK_DISPLAY_EVENTS : [];

  const handleCardPress = (item: DisplayEvent) => {
    if (item.originalEvent) {
      handleEventPress(item.originalEvent);
    }
  };

  // No loading state - data is prefetched during splash screen
  if (displayData.length === 0) {
    return null; // Don't show section if no events
  }

  const handleViewAll = () => {
    navigation.navigate('EventsViewAll');
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Upcoming Events"
        subtitle={
          socialProof?.checkinsThisWeek && socialProof.checkinsThisWeek > 5
            ? `${displayData.length} events this week`
            : "Don't Miss Out"
        }
        actionText="View All"
        onActionPress={handleViewAll}
      />
      <Spacer size="sm" />

      <FlatList
        data={displayData}
        renderItem={({ item }) => (
          <EventCard
            name={item.name}
            date={item.date}
            time={item.time}
            venue={item.venue}
            imageUrl={item.imageUrl}
            imageSource={item.imageSource}
            isCityWide={item.isCityWide}
            onPress={item.originalEvent ? () => handleCardPress(item) : undefined}
          />
        )}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={EVENT_CARD_HEIGHT + spacing.md}
        decelerationRate="fast"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
});
