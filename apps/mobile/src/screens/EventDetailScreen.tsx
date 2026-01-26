import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, Share, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, radius } from '../constants/colors';

const APP_STORE_URL = 'https://apps.apple.com/app/tastelanc/id6755852717';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.tastelanc.app';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;

// Format event type for display
const formatEventType = (type: string): string => {
  const typeMap: Record<string, string> = {
    live_music: 'Live Music',
    dj: 'DJ Night',
    trivia: 'Trivia',
    karaoke: 'Karaoke',
    comedy: 'Comedy',
    sports: 'Sports',
    other: 'Special Event',
  };
  return typeMap[type] || type;
};

// Format time for display (24h to 12h)
const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

// Format days of week for recurring events
const formatDaysOfWeek = (days: string[]): string => {
  const dayMap: Record<string, string> = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun',
  };
  return days.map(d => dayMap[d] || d).join(', ');
};

export default function EventDetailScreen({ route, navigation }: Props) {
  const { event } = route.params;

  const handleViewRestaurant = () => {
    if (event.restaurant?.id) {
      navigation.navigate('RestaurantDetail', { id: event.restaurant.id });
    }
  };

  const handleShare = async () => {
    try {
      // Build event date string
      let dateStr = '';
      if (event.is_recurring) {
        dateStr = `Every ${formatDaysOfWeek(event.days_of_week)}`;
      } else if (event.event_date) {
        dateStr = formatDate(event.event_date);
      }

      const timeStr = `${formatTime(event.start_time)}${event.end_time ? ` - ${formatTime(event.end_time)}` : ''}`;
      const venueStr = event.restaurant?.name ? `at ${event.restaurant.name}` : '';
      const downloadUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

      const message = `Check out ${event.name} ${venueStr} on TasteLanc!\n\n${dateStr}\n${timeStr}\n\nDownload the app: ${downloadUrl}`;

      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: event.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)', colors.background]}
            style={styles.heroGradient}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </TouchableOpacity>

          {/* Event Type Badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{formatEventType(event.event_type)}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Event Name */}
          <Text style={styles.eventName}>{event.name}</Text>

          {/* Date & Time */}
          <View style={styles.dateTimeContainer}>
            <Ionicons name="calendar-outline" size={20} color={colors.accent} />
            <View style={styles.dateTimeText}>
              {event.is_recurring ? (
                <Text style={styles.dateText}>
                  Every {formatDaysOfWeek(event.days_of_week)}
                </Text>
              ) : event.event_date ? (
                <Text style={styles.dateText}>{formatDate(event.event_date)}</Text>
              ) : null}
              <Text style={styles.timeText}>
                {formatTime(event.start_time)}
                {event.end_time && ` - ${formatTime(event.end_time)}`}
              </Text>
            </View>
          </View>

          {/* Performer (if available) */}
          {event.performer_name && (
            <View style={styles.infoRow}>
              <Ionicons name="musical-notes-outline" size={20} color={colors.accent} />
              <Text style={styles.infoText}>{event.performer_name}</Text>
            </View>
          )}

          {/* Cover Charge (if available) */}
          {event.cover_charge != null && event.cover_charge > 0 && (
            <View style={styles.infoRow}>
              <Ionicons name="ticket-outline" size={20} color={colors.accent} />
              <Text style={styles.infoText}>Cover: ${event.cover_charge}</Text>
            </View>
          )}

          {/* Description */}
          {event.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>About This Event</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          )}

          {/* Restaurant Card */}
          <View style={styles.restaurantCard}>
            <Text style={styles.sectionTitle}>Venue</Text>
            <TouchableOpacity
              style={styles.restaurantInfo}
              onPress={handleViewRestaurant}
            >
              <View style={styles.restaurantDetails}>
                <Text style={styles.restaurantName}>{event.restaurant.name}</Text>
                <Text style={styles.viewRestaurantText}>View Restaurant →</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleViewRestaurant}
        >
          <Text style={styles.ctaButtonText}>View Restaurant</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  heroContainer: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: HERO_HEIGHT * 0.6,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    position: 'absolute',
    top: 50,
    left: 66,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  typeBadgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    paddingTop: 0,
    marginTop: -40,
  },
  eventName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.md,
  },
  dateTimeText: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoText: {
    fontSize: 16,
    color: colors.text,
  },
  descriptionContainer: {
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  restaurantCard: {
    marginTop: 8,
    marginBottom: 100,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: radius.md,
  },
  restaurantDetails: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  viewRestaurantText: {
    fontSize: 14,
    color: colors.accent,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    paddingBottom: 34,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});
