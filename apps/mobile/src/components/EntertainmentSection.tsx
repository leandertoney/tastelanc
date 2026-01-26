import { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import EntertainmentCard, { ENTERTAINMENT_CARD_SIZE } from './EntertainmentCard';
import PartnerCTACard from './PartnerCTACard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { fetchEntertainmentEvents, ApiEvent, ENTERTAINMENT_TYPES } from '../lib/events';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/colors';
import { ENABLE_MOCK_DATA, MOCK_ENTERTAINMENT, type MockEntertainment } from '../config/mockData';
import type { DayOfWeek } from '../types/database';
import { useEmailGate } from '../hooks';
import { trackClick } from '../lib/analytics';

const CTA_ITEM_ID = '__partner_cta__';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface EntertainmentResult {
  events: ApiEvent[];
  isFallback: boolean;
}

async function getTodayEntertainment(): Promise<EntertainmentResult> {
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
  }).slice(0, 10);

  if (todayEvents.length > 0) {
    return { events: todayEvents, isFallback: false };
  }

  // Fallback: upcoming entertainment events
  const upcomingEvents = events.filter(event => {
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  }).slice(0, 10);

  return { events: upcomingEvents, isFallback: true };
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

  const { data, isLoading } = useQuery({
    queryKey: ['todayEntertainment'],
    queryFn: getTodayEntertainment,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const events = data?.events || [];
  const isFallback = data?.isFallback ?? true;

  // Map API events to display format (keep original event for navigation)
  const mappedEvents = events.map((event) => ({
    id: event.id,
    name: event.name,
    eventType: event.event_type,
    time: formatEventTime(event.start_time, event.end_time),
    venue: event.restaurant?.name,
    imageUrl: event.image_url, // API always provides image_url
    restaurantId: event.restaurant?.id,
    originalEvent: event, // Keep reference for navigation
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

  // No loading state - data is prefetched during splash screen
  // Ensure we always have data to show in dev mode
  const finalDisplayData = displayData.length > 0 ? displayData : ENABLE_MOCK_DATA ? MOCK_ENTERTAINMENT : [];

  // Add CTA item at the end
  const dataWithCTA = [...finalDisplayData, { id: CTA_ITEM_ID } as MockEntertainment];

  // Hide section if no data and mock is disabled
  if (finalDisplayData.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Entertainment"
        subtitle={isFallback ? 'Upcoming' : 'Tonight'}
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
