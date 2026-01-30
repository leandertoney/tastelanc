import { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps, NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { fetchEvents, ApiEvent } from '../lib/events';
import { colors, radius, spacing } from '../constants/colors';
import SpotifyStyleListItem from '../components/SpotifyStyleListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'ArtistDetail'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fetch events for a specific artist (self-promoter)
async function getArtistEvents(artistId: string): Promise<ApiEvent[]> {
  const allEvents = await fetchEvents();
  const todayDate = new Date().toISOString().split('T')[0];

  // Filter to this artist's events that are upcoming or recurring
  return allEvents.filter((event) => {
    if (event.self_promoter?.id !== artistId) return false;
    if (event.is_recurring) return true;
    if (event.event_date && event.event_date >= todayDate) return true;
    return false;
  });
}

function formatEventTime(startTime: string, endTime: string | null): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };

  if (endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

function formatEventDate(dateString: string | null, isRecurring: boolean, daysOfWeek?: string[]): string {
  if (isRecurring && daysOfWeek?.length) {
    const dayLabels = daysOfWeek.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3));
    return `Every ${dayLabels.join(', ')}`;
  }
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

const EVENT_TYPE_LABELS: Record<string, string> = {
  live_music: 'Live Music',
  dj: 'DJ',
  trivia: 'Trivia',
  karaoke: 'Karaoke',
  comedy: 'Comedy',
  sports: 'Sports',
  promotion: 'Promo',
  other: 'Event',
};

export default function ArtistDetailScreen({ route }: Props) {
  const navigation = useNavigation<NavigationProp>();
  const { artistId, artistName } = route.params;

  const {
    data: events = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['artistEvents', artistId],
    queryFn: () => getArtistEvents(artistId),
    staleTime: 5 * 60 * 1000,
  });

  // Get artist info from first event (all events have the same self_promoter)
  const artistInfo = useMemo(() => {
    if (events.length === 0) return null;
    return events[0].self_promoter;
  }, [events]);

  const handleEventPress = useCallback(
    (event: ApiEvent) => {
      navigation.navigate('EventDetail', { event });
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: ApiEvent }) => {
    const timeDisplay = formatEventTime(item.start_time, item.end_time);
    const dateDisplay = formatEventDate(item.event_date ?? null, item.is_recurring, item.days_of_week);
    const typeLabel = EVENT_TYPE_LABELS[item.event_type] || 'Event';

    return (
      <SpotifyStyleListItem
        imageUrl={item.image_url}
        title={item.name}
        subtitle={`${dateDisplay} · ${timeDisplay}`}
        detail={typeLabel}
        onPress={() => handleEventPress(item)}
        fallbackIcon="calendar"
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={events}
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
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Artist Profile */}
            <View style={styles.profileSection}>
              {artistInfo?.profile_image_url ? (
                <Image
                  source={{ uri: artistInfo.profile_image_url }}
                  style={styles.profileImage}
                />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="person" size={48} color={colors.textMuted} />
                </View>
              )}
              <Text style={styles.artistName}>{artistName}</Text>
              <Text style={styles.eventCount}>
                {events.length} upcoming {events.length === 1 ? 'event' : 'events'}
              </Text>
            </View>

            {/* Section Header */}
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Upcoming Events</Text>
            <Text style={styles.emptyText}>
              This artist doesn't have any scheduled events right now.
            </Text>
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
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    marginBottom: spacing.md,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: spacing.md,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  artistName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
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
    paddingHorizontal: spacing.lg,
  },
});
