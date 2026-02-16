import { useCallback, useRef } from 'react';
import { View, StyleSheet, FlatList, ViewToken } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EntertainmentCard, { ENTERTAINMENT_CARD_SIZE } from './EntertainmentCard';
import PartnerCTACard from './PartnerCTACard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { fetchEntertainmentEvents, ApiEvent, ENTERTAINMENT_TYPES, getEventVenueName } from '../lib/events';
import { eliteFirstStableSort } from '../lib/fairRotation';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_ENTERTAINMENT, type MockEntertainment } from '../config/mockData';
import type { DayOfWeek } from '../types/database';
import { useEmailGate } from '../hooks';
import { useMarket } from '../context/MarketContext';
import { trackClick } from '../lib/analytics';
import { trackImpression } from '../lib/impressions';

const CTA_ITEM_ID = '__partner_cta__';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntertainmentResult {
  events: ApiEvent[];
  hasTodayEvents: boolean;
}

async function getEntertainmentEvents(): Promise<EntertainmentResult> {
  const events = await fetchEntertainmentEvents();
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
  const todayDate = now.toISOString().split('T')[0];

  // Filter to upcoming/recurring events
  const upcoming = events.filter(event => {
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

  // Today's events first, then future events
  const sorted = [...todayEvents, ...futureEvents];

  // Apply elite-first stable sort (preserves chronological within tier groups)
  const tierSorted = eliteFirstStableSort(
    sorted,
    (event) => (event.restaurant?.tiers?.name as any) || 'basic',
  );

  return { events: tierSorted.slice(0, 5), hasTodayEvents: todayEvents.length > 0 };
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

export default function EntertainmentSection() {
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['entertainmentEvents', marketId],
    queryFn: getEntertainmentEvents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const events = data?.events || [];
  const hasTodayEvents = data?.hasTodayEvents ?? false;

  // Map API events to display format (keep original event for navigation)
  const mappedEvents = events.map((event) => ({
    id: event.id,
    name: event.name,
    eventType: event.event_type,
    time: formatEventTime(event.start_time, event.end_time),
    venue: getEventVenueName(event),
    imageUrl: event.image_url,
    restaurantId: event.restaurant?.id,
    originalEvent: event,
  }));

  // Use real events if available, otherwise use mock data if enabled
  const displayData: MockEntertainment[] =
    mappedEvents.length > 0 ? mappedEvents : ENABLE_MOCK_DATA ? MOCK_ENTERTAINMENT : [];

  const { requireEmailGate } = useEmailGate();

  const handleEventPress = useCallback(
    (event: ApiEvent) => {
      trackClick('event', event.restaurant?.id);
      requireEmailGate(() => navigation.navigate('EventDetail', { event }));
    },
    [navigation, requireEmailGate]
  );

  const handleViewAll = useCallback(() => {
    requireEmailGate(() => navigation.navigate('EntertainmentViewAll'));
  }, [navigation, requireEmailGate]);

  // Track impressions when items become visible
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as MockEntertainment;
      if (item?.restaurantId && item.id !== CTA_ITEM_ID) {
        trackImpression(item.restaurantId, 'entertainment', token.index ?? 0);
      }
    }
  }).current;

  const finalDisplayData = displayData.length > 0 ? displayData : ENABLE_MOCK_DATA ? MOCK_ENTERTAINMENT : [];

  // Add CTA item at the end
  const dataWithCTA = [...finalDisplayData, { id: CTA_ITEM_ID } as MockEntertainment];

  // Hide only when query has settled and there's genuinely no data
  if (finalDisplayData.length === 0) {
    if (isLoading || isFetching) return <View />;
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title={hasTodayEvents ? 'Entertainment Tonight' : 'Upcoming Entertainment'}
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
                headline="Hosting events?"
                subtext="Get your events featured here"
                category="entertainment"
                width={ENTERTAINMENT_CARD_SIZE}
                height={ENTERTAINMENT_CARD_SIZE}
              />
            );
          }
          return (
            <EntertainmentCard
              name={item.name}
              eventType={item.eventType}
              time={item.time}
              venue={item.venue}
              imageUrl={item.imageUrl}
              onPress={item.originalEvent ? () => handleEventPress(item.originalEvent!) : undefined}
            />
          );
        }}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={ENTERTAINMENT_CARD_SIZE + spacing.md}
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
