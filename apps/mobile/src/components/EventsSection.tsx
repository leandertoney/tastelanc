import { useCallback } from 'react';
import { View, StyleSheet, FlatList, ImageSourcePropType } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EventCard, { EVENT_CARD_HEIGHT, EVENT_CARD_WIDTH } from './EventCard';
import PartnerCTACard from './PartnerCTACard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { fetchEvents, ENTERTAINMENT_TYPES, ApiEvent, getEventVenueName, isSelfPromoterEvent } from '../lib/events';
import { paidFairRotate } from '../lib/fairRotation';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_EVENTS } from '../config/mockData';
import type { PremiumTier } from '../types/database';
import { usePlatformSocialProof, useEmailGate } from '../hooks';
import { trackClick } from '../lib/analytics';

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

function getEventTierName(event: ApiEvent): PremiumTier {
  return (event.restaurant?.tiers?.name as PremiumTier) || 'basic';
}

async function getUpcomingEvents(): Promise<ApiEvent[]> {
  // Fetch all events and filter out entertainment types inline
  const allEvents = await fetchEvents();
  const nonEntertainment = allEvents.filter(
    event => !ENTERTAINMENT_TYPES.includes(event.event_type)
  );

  // Filter to upcoming/recurring events
  const today = new Date().toISOString().split('T')[0];
  const upcoming = nonEntertainment.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= today) return true;
    return false;
  });

  // Filter to paid only and apply fair rotation (Elite first, Premium shuffled)
  const paidRotated = paidFairRotate(upcoming, getEventTierName);
  return paidRotated.slice(0, 15);
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
  const { data: socialProof } = usePlatformSocialProof();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: getUpcomingEvents,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

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
