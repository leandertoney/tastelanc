import { useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, ImageSourcePropType, ViewToken } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EventCard, { EVENT_CARD_HEIGHT, EVENT_CARD_WIDTH } from './EventCard';
import PartnerCTACard from './PartnerCTACard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { fetchEvents, ENTERTAINMENT_TYPES, ApiEvent, getEventVenueName, isSelfPromoterEvent } from '../lib/events';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_EVENTS } from '../config/mockData';
import type { DayOfWeek } from '../types/database';
import { useEmailGate } from '../hooks';
import { trackClick } from '../lib/analytics';
import { trackImpression } from '../lib/impressions';

const CTA_ITEM_ID = '__partner_cta__';

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

interface EventsResult {
  events: ApiEvent[];
  hasTodayEvents: boolean;
}

async function getUpcomingEvents(): Promise<EventsResult> {
  const allEvents = await fetchEvents();
  const nonEntertainment = allEvents.filter(
    event => !ENTERTAINMENT_TYPES.includes(event.event_type)
  );

  const now = new Date();
  const todayDate = now.toISOString().split('T')[0];
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;

  // Filter to upcoming/recurring events
  const upcoming = nonEntertainment.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  });

  // Identify today's events (one-time today OR recurring on this day of week)
  const isToday = (event: ApiEvent) => {
    if (event.event_date === todayDate) return true;
    if (event.is_recurring && event.days_of_week.includes(dayOfWeek)) return true;
    return false;
  };

  const todayEvents = upcoming.filter(isToday);
  const futureEvents = upcoming.filter(e => !isToday(e));

  // Sort today's events by start time
  todayEvents.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  // Sort future events by date (ascending), then start time; recurring without dates go last
  futureEvents.sort((a, b) => {
    const dateA = a.event_date || '9999-12-31';
    const dateB = b.event_date || '9999-12-31';
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (a.start_time || '').localeCompare(b.start_time || '');
  });

  // Today's events first, then future events, capped at 5
  const sorted = [...todayEvents, ...futureEvents];
  return { events: sorted.slice(0, 5), hasTodayEvents: todayEvents.length > 0 };
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
    const date = new Date(event.event_date + 'T00:00:00');
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

  const { data } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: getUpcomingEvents,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const events = data?.events || [];
  const hasTodayEvents = data?.hasTodayEvents ?? false;

  const { requireEmailGate } = useEmailGate();

  const handleEventPress = useCallback(
    (event: ApiEvent) => {
      trackClick('event', event.restaurant?.id);
      requireEmailGate(() => navigation.navigate('EventDetail', { event }));
    },
    [navigation, requireEmailGate]
  );

  // Map API events to display format
  const mappedEvents: DisplayEvent[] = events.map((event) => ({
    id: event.id,
    name: event.name,
    date: formatEventDate(event),
    time: formatEventTime(event.start_time, event.end_time),
    venue: getEventVenueName(event),
    imageUrl: event.image_url, // API always provides image_url
    isCityWide: !event.restaurant && !event.self_promoter,
    restaurantId: event.restaurant?.id,
    originalEvent: event, // Keep original for EventDetail navigation
  }));

  // Use real events, or mock events if enabled and no real data
  const displayData = events.length > 0 ? mappedEvents : ENABLE_MOCK_DATA ? MOCK_DISPLAY_EVENTS : [];

  // Add CTA item at the end
  const dataWithCTA = [...displayData, { id: CTA_ITEM_ID } as DisplayEvent];

  const handleCardPress = (item: DisplayEvent) => {
    if (item.originalEvent) {
      handleEventPress(item.originalEvent);
    }
  };

  // Track impressions when items become visible
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as DisplayEvent;
      if (item?.restaurantId && item.id !== CTA_ITEM_ID) {
        trackImpression(item.restaurantId, 'events', token.index ?? 0);
      }
    }
  }).current;

  // Return null if no data - cache persistence will prevent flash
  if (displayData.length === 0) {
    return null;
  }

  const handleViewAll = () => {
    requireEmailGate(() => navigation.navigate('EventsViewAll'));
  };

  return (
    <View style={styles.container}>
      <SectionHeader
        title={hasTodayEvents ? 'Events Today' : 'Upcoming Events'}
        subtitle={hasTodayEvents ? undefined : "Don't Miss Out"}
        actionText="View All"
        onActionPress={handleViewAll}
      />
      <Spacer size="sm" />

      <FlatList
        data={dataWithCTA}
        renderItem={({ item }) => {
          if (item.id === CTA_ITEM_ID) {
            return (
              <PartnerCTACard
                icon="calendar"
                headline="Promote your event"
                subtext="Reach thousands of local diners"
                category="event"
                width={EVENT_CARD_WIDTH}
                height={EVENT_CARD_HEIGHT}
              />
            );
          }
          return (
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
          );
        }}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={EVENT_CARD_HEIGHT + spacing.md}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
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
