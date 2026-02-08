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
import { paidFairRotate, isPaidTier } from '../lib/fairRotation';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_ENTERTAINMENT, type MockEntertainment } from '../config/mockData';
import type { DayOfWeek, PremiumTier } from '../types/database';
import { useEmailGate } from '../hooks';
import { trackClick } from '../lib/analytics';
import { trackImpression } from '../lib/impressions';

const CTA_ITEM_ID = '__partner_cta__';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntertainmentResult {
  events: ApiEvent[];
  isUpcoming: boolean;
}

function getEventTierName(event: ApiEvent): PremiumTier {
  return (event.restaurant?.tiers?.name as PremiumTier) || 'basic';
}

async function getEntertainmentEvents(): Promise<EntertainmentResult> {
  const events = await fetchEntertainmentEvents();
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
  const todayDate = now.toISOString().split('T')[0];

  // Filter for today's entertainment (recurring on this day OR one-time today)
  const todayEvents = events.filter(event => {
    if (event.is_recurring && event.days_of_week.includes(dayOfWeek)) {
      return true;
    }
    if (event.event_date === todayDate) {
      return true;
    }
    return false;
  });

  // If we have today's events, filter to paid only and apply fair rotation
  if (todayEvents.length > 0) {
    const paidRotated = paidFairRotate(todayEvents, getEventTierName);
    return { events: paidRotated.slice(0, 15), isUpcoming: false };
  }

  // Otherwise, show upcoming paid events with fair rotation
  const upcomingEvents = events.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  });

  const paidRotated = paidFairRotate(upcomingEvents, getEventTierName);
  return { events: paidRotated.slice(0, 15), isUpcoming: true };
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

  const { data } = useQuery({
    queryKey: ['entertainmentEvents'],
    queryFn: getEntertainmentEvents,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const events = data?.events || [];
  const isUpcoming = data?.isUpcoming ?? true;

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

  // Return null if no data - cache persistence will prevent flash
  if (finalDisplayData.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title={isUpcoming ? 'Upcoming Entertainment' : 'Entertainment'}
        subtitle={isUpcoming ? undefined : 'Tonight'}
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
