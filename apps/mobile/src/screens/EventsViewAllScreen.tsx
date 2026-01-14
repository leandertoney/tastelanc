import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { EventType, DayOfWeek } from '../types/database';
import { fetchEvents, ApiEvent } from '../lib/events';
import { colors, radius, spacing } from '../constants/colors';
import DateHeader from '../components/DateHeader';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DAYS_OF_WEEK: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const DAY_LABELS: Record<DayOfWeek, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  live_music: 'Live Music',
  dj: 'DJ Night',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  other: 'Other',
};

const EVENT_TYPE_ICONS: Record<EventType, keyof typeof Ionicons.glyphMap> = {
  live_music: 'musical-notes',
  dj: 'disc',
  trivia: 'help-circle',
  karaoke: 'mic',
  comedy: 'happy',
  sports: 'football',
  other: 'calendar',
};

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
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

function getDayFromDate(dateString: string): DayOfWeek {
  const date = new Date(dateString + 'T00:00:00');
  const dayIndex = date.getDay();
  return DAYS_OF_WEEK[dayIndex];
}

interface GroupedSection {
  title: string; // ISO date or 'recurring'
  data: ApiEvent[];
}

function groupEventsByDate(events: ApiEvent[]): GroupedSection[] {
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

  // Sort dates and create sections
  const sortedDates = Object.keys(groups).sort();
  const sections: GroupedSection[] = sortedDates.map((date) => ({
    title: date,
    data: groups[date],
  }));

  // Add recurring events at the end if any
  if (recurringEvents.length > 0) {
    sections.push({
      title: 'recurring',
      data: recurringEvents,
    });
  }

  return sections;
}

interface EventCardProps {
  event: ApiEvent;
  onPress: () => void;
}

function EventCard({ event, onPress }: EventCardProps) {
  const icon = EVENT_TYPE_ICONS[event.event_type] || 'calendar';
  const typeLabel = EVENT_TYPE_LABELS[event.event_type] || 'Event';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: event.image_url, cache: 'reload' }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <View style={styles.typeBadge}>
          <Ionicons name={icon} size={12} color={colors.accent} />
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
        <Text style={styles.eventName} numberOfLines={1}>
          {event.name}
        </Text>
        <Text style={styles.venueName} numberOfLines={1}>
          {event.restaurant?.name || 'City-wide Event'}
        </Text>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText}>{formatEventDate(event)}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText}>
              {formatEventTime(event.start_time, event.end_time)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsViewAllScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);

  const { data: events = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['allEvents'],
    queryFn: getAllEvents,
    staleTime: 5 * 60 * 1000,
  });

  // Filter events by selected day
  const filteredEvents = useMemo(() => {
    if (!selectedDay) return events;
    return events.filter((e) => {
      // Check if recurring event includes this day
      if (e.is_recurring && e.days_of_week.includes(selectedDay)) {
        return true;
      }
      // Check if one-time event falls on this day
      if (e.event_date) {
        const eventDay = getDayFromDate(e.event_date);
        return eventDay === selectedDay;
      }
      return false;
    });
  }, [events, selectedDay]);

  // Group filtered events by date
  const sections = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  const handlePress = useCallback(
    (event: ApiEvent) => {
      navigation.navigate('EventDetail', { event });
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: ApiEvent }) => (
    <View style={styles.itemContainer}>
      <EventCard event={item} onPress={() => handlePress(item)} />
    </View>
  );

  const renderSectionHeader = ({ section }: { section: GroupedSection }) => (
    <DateHeader date={section.title} />
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Day-of-Week Filter */}
      <FlatList
        data={DAYS_OF_WEEK}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
        renderItem={({ item: day }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedDay === day && styles.filterChipActive]}
            onPress={() => setSelectedDay(selectedDay === day ? null : day)}
          >
            <Text
              style={[styles.filterChipText, selectedDay === day && styles.filterChipTextActive]}
            >
              {DAY_LABELS[day]}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {/* Events List grouped by date */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>No events found</Text>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.text,
  },
  listContent: {
    paddingBottom: spacing.lg,
  },
  itemContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardImagePlaceholder: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    padding: spacing.md,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${colors.accent}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
    marginBottom: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  venueName: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.textMuted,
  },
});
