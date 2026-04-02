import { useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions, Share, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { trackScreenView } from '../lib/analytics';
import { isSelfPromoterEvent, getEventVenueName } from '../lib/events';

type Props = NativeStackScreenProps<RootStackParamList, 'EventDetail'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 300;

// TFK brand colors — only used when event.partner_slug === 'thirsty-for-knowledge'
const TFK_ED = {
  gradientHero: ['#1A2A4A', '#6D28D9', '#DB2777'] as const,
  goldLight: '#FCD34D',
  purple: '#6D28D9',
  navy: '#1A2A4A',
  cardBg: 'rgba(26,42,74,0.9)',
  cardBorder: 'rgba(252,211,77,0.3)',
  textWhite: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
} as const;

const DAY_MAP: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const EVENT_TYPE_MAP: Record<string, string> = {
  live_music: 'Live Music', dj: 'DJ Night', trivia: 'Trivia',
  karaoke: 'Karaoke', comedy: 'Comedy', sports: 'Sports',
  bingo: 'Bingo', music_bingo: 'Music Bingo', other: 'Special Event',
};

const formatEventType = (type: string) => EVENT_TYPE_MAP[type] || type;

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const formatDate = (dateString: string): string =>
  new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

const formatDaysOfWeek = (days: string[]) =>
  days.map(d => DAY_MAP[d] || d).join(', ');

// ─── Info tile used in the quick-stats grid ───────────────────────────────────
function InfoTile({
  icon, label, value, accent,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent?: string }) {
  const styles = useStyles();
  const colors = getColors();
  return (
    <View style={styles.infoTile}>
      <Ionicons name={icon} size={20} color={accent ?? colors.accent} style={styles.infoTileIcon} />
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text style={styles.infoTileValue}>{value}</Text>
    </View>
  );
}

export default function EventDetailScreen({ route, navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const insets = useSafeAreaInsets();
  const { event } = route.params;
  const isFromSelfPromoter = isSelfPromoterEvent(event);
  const venueName = getEventVenueName(event);
  const isTFKEvent = event.partner_slug === 'thirsty-for-knowledge';
  const isLinkedVenue = isTFKEvent && !!event.restaurant?.id;

  useEffect(() => {
    trackScreenView('EventDetail', event.restaurant?.id || event.self_promoter?.id);
  }, [event.id]);

  const handleViewRestaurant = () => {
    if (event.restaurant?.id) {
      navigation.navigate('RestaurantDetail', { id: event.restaurant.id });
    }
  };

  const handleViewArtist = () => {
    if (event.self_promoter) {
      navigation.navigate('ArtistDetail', {
        artistId: event.self_promoter.id,
        artistName: event.self_promoter.name,
      });
    }
  };

  const handleShare = async () => {
    try {
      let dateStr = '';
      if (event.is_recurring) dateStr = `Every ${formatDaysOfWeek(event.days_of_week)}`;
      else if (event.event_date) dateStr = formatDate(event.event_date);
      const timeStr = `${formatTime(event.start_time)}${event.end_time ? ` - ${formatTime(event.end_time)}` : ''}`;
      const venueStr = venueName ? `${isFromSelfPromoter ? 'by' : 'at'} ${venueName}` : '';
      const downloadUrl = Platform.OS === 'ios' ? brand.appStoreUrl : brand.playStoreUrl;
      await Share.share({
        message: `Check out ${event.name} ${venueStr} on ${brand.appName}!\n\n${dateStr}\n${timeStr}\n\nDownload the app: ${downloadUrl}`,
      });
    } catch (e) {
      // ignore
    }
  };

  // Build date/time strings for reuse
  const dateLabel = event.is_recurring
    ? `Every ${formatDaysOfWeek(event.days_of_week)}`
    : event.event_date ? formatDate(event.event_date) : '';
  const timeLabel = event.end_time
    ? `${formatTime(event.start_time)} – ${formatTime(event.end_time)}`
    : formatTime(event.start_time);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} bounces={false} showsVerticalScrollIndicator={false}>

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        {isTFKEvent ? (
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={TFK_ED.gradientHero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tfkHeroGradient}
            />
            <View style={styles.tfkHeroCenter} pointerEvents="none">
              <View style={styles.tfkLogoBadge}>
                <Ionicons name="bulb" size={40} color={TFK_ED.goldLight} />
              </View>
              <Text style={styles.tfkWordmark}>Thirsty for Knowledge</Text>
              <Text style={styles.tfkTagline}>Bar Trivia · Lancaster, PA</Text>
            </View>
            <View style={[styles.tfkTypeBadge, { top: insets.top + 10 }]}>
              <Text style={styles.tfkTypeBadgeText}>{formatEventType(event.event_type)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.heroContainer}>
            <Image source={{ uri: event.image_url }} style={styles.heroImage} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)', colors.background]}
              style={styles.heroGradient}
            />
            <View style={[styles.typeBadge, { top: insets.top + 10 }]}>
              <Text style={styles.typeBadgeText}>{formatEventType(event.event_type)}</Text>
            </View>
          </View>
        )}

        {/* ── CONTENT ──────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Event name */}
          <Text style={styles.eventName}>{event.name}</Text>

          {/* Quick-stats grid: 2 columns */}
          <View style={styles.infoGrid}>
            {dateLabel ? (
              <InfoTile
                icon="calendar-outline"
                label={event.is_recurring ? 'Recurring' : 'Date'}
                value={dateLabel}
                accent={isTFKEvent ? TFK_ED.purple : undefined}
              />
            ) : null}
            <InfoTile
              icon="time-outline"
              label="Time"
              value={timeLabel}
              accent={isTFKEvent ? TFK_ED.purple : undefined}
            />
            <InfoTile
              icon={isTFKEvent ? 'bulb-outline' : 'calendar-outline'}
              label="Type"
              value={formatEventType(event.event_type)}
              accent={isTFKEvent ? TFK_ED.purple : undefined}
            />
            {event.cover_charge != null && event.cover_charge > 0 ? (
              <InfoTile
                icon="ticket-outline"
                label="Cover"
                value={`$${event.cover_charge}`}
                accent={isTFKEvent ? TFK_ED.purple : undefined}
              />
            ) : (
              <InfoTile
                icon="ticket-outline"
                label="Cover"
                value="Free"
                accent={isTFKEvent ? TFK_ED.purple : undefined}
              />
            )}
          </View>

          {/* Description */}
          {event.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About This Event</Text>
              <Text style={styles.description}>{event.description}</Text>
            </View>
          ) : null}

          {/* Venue block ─ TFK events */}
          {isTFKEvent && event.performer_name && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue</Text>
              {isLinkedVenue ? (
                <TouchableOpacity style={styles.venueCard} onPress={handleViewRestaurant} activeOpacity={0.8}>
                  <View style={styles.venueCardLeft}>
                    <Ionicons name="location" size={18} color={TFK_ED.purple} />
                    <View style={styles.venueCardText}>
                      <Text style={styles.venueName}>{event.performer_name}</Text>
                      <Text style={styles.venueSubtext}>Tap to view restaurant page</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ) : (
                <View style={[styles.venueCard, styles.venueCardUnlinked]}>
                  <View style={styles.venueCardLeft}>
                    <Ionicons name="location-outline" size={18} color={colors.textMuted} />
                    <Text style={[styles.venueName, { color: colors.text }]}>{event.performer_name}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* TFK — full schedule CTA */}
          {isTFKEvent && (
            <TouchableOpacity
              style={styles.tfkCTA}
              onPress={() => navigation.navigate('ThirstyKnowledge')}
              activeOpacity={0.8}
            >
              <View style={styles.tfkCTALeft}>
                <Text style={styles.tfkCTATitle}>See Full Weekly Schedule</Text>
                <Text style={styles.tfkCTASub}>Trivia · Music Bingo · Karaoke across Lancaster</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={TFK_ED.goldLight} />
            </TouchableOpacity>
          )}

          {/* Venue card — non-TFK restaurant events */}
          {!isTFKEvent && !isFromSelfPromoter && venueName && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Venue</Text>
              <TouchableOpacity style={styles.venueCard} onPress={handleViewRestaurant} activeOpacity={0.8}>
                <View style={styles.venueCardLeft}>
                  <Ionicons name="location" size={18} color={colors.accent} />
                  <View style={styles.venueCardText}>
                    <Text style={styles.venueName}>{venueName}</Text>
                    <Text style={styles.venueSubtext}>View restaurant page</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Artist card — self-promoter events */}
          {!isTFKEvent && isFromSelfPromoter && event.self_promoter && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>More from {event.self_promoter.name}</Text>
              <TouchableOpacity style={styles.venueCard} onPress={handleViewArtist} activeOpacity={0.8}>
                <View style={styles.venueCardLeft}>
                  <Ionicons name="musical-notes" size={18} color={colors.accent} />
                  <View style={styles.venueCardText}>
                    <Text style={styles.venueName}>{event.self_promoter.name}</Text>
                    <Text style={styles.venueSubtext}>See all upcoming events</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Performer (non-TFK) */}
          {!isTFKEvent && event.performer_name && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performer</Text>
              <View style={styles.performerRow}>
                <Ionicons name="musical-notes-outline" size={20} color={colors.accent} />
                <Text style={styles.performerName}>{event.performer_name}</Text>
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Back + share float above the ScrollView — never blocked by hero content */}
      <TouchableOpacity style={[styles.backButton, { top: insets.top + 10 }]} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={isTFKEvent ? TFK_ED.textWhite : colors.text} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.shareButton, { top: insets.top + 10 }]} onPress={handleShare}>
        <Ionicons name="share-outline" size={22} color={isTFKEvent ? TFK_ED.textWhite : colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  scrollView: { flex: 1 },

  // ── Hero ──────────────────────────────────────────────────────────
  heroContainer: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
    position: 'relative' as const,
  },
  heroImage: { width: '100%' as const, height: '100%' as const },
  heroGradient: {
    position: 'absolute' as const,
    left: 0, right: 0, bottom: 0,
    height: HERO_HEIGHT * 0.6,
  },
  backButton: {
    position: 'absolute' as const,
    left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 100,
  },
  shareButton: {
    position: 'absolute' as const,
    left: 66,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    zIndex: 100,
  },
  typeBadge: {
    position: 'absolute' as const,
    right: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.sm,
  },
  typeBadgeText: { color: colors.background, fontSize: 12, fontWeight: '600' as const },

  // ── Content ───────────────────────────────────────────────────────
  content: {
    padding: 20,
    paddingTop: 0,
    marginTop: -40,
    gap: 4,
  },
  eventName: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 32,
  },

  // ── Info grid ─────────────────────────────────────────────────────
  infoGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 10,
    marginBottom: 24,
  },
  infoTile: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 40 - 10) / 2 - 5,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
  },
  infoTileIcon: { marginBottom: 2 },
  infoTileLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.7,
  },
  infoTileValue: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: 20,
  },

  // ── Section ───────────────────────────────────────────────────────
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    lineHeight: 26,
    color: colors.textSecondary,
  },

  // ── Venue card ────────────────────────────────────────────────────
  venueCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
  },
  venueCardUnlinked: {
    opacity: 0.75,
  },
  venueCardLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    flex: 1,
  },
  venueCardText: { flex: 1 },
  venueName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 2,
  },
  venueSubtext: {
    fontSize: 13,
    color: colors.accent,
  },

  // ── Performer row ─────────────────────────────────────────────────
  performerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
  },
  performerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },

  // ── TFK hero ──────────────────────────────────────────────────────
  tfkHeroGradient: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
  },
  tfkHeroCenter: {
    position: 'absolute' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  tfkLogoBadge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(26,42,74,0.85)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: TFK_ED.goldLight,
    marginBottom: 4,
  },
  tfkWordmark: {
    fontSize: 26, fontWeight: '800' as const,
    color: TFK_ED.textWhite,
    textAlign: 'center' as const,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tfkTagline: {
    fontSize: 13,
    color: TFK_ED.goldLight,
    textAlign: 'center' as const,
    opacity: 0.9,
  },
  tfkTypeBadge: {
    position: 'absolute' as const,
    right: 16,
    backgroundColor: TFK_ED.purple,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: TFK_ED.goldLight,
  },
  tfkTypeBadgeText: {
    color: TFK_ED.textWhite,
    fontSize: 12, fontWeight: '700' as const,
  },

  // ── TFK CTA ───────────────────────────────────────────────────────
  tfkCTA: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: TFK_ED.navy,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: TFK_ED.cardBorder,
    padding: 16,
    marginBottom: 24,
  },
  tfkCTALeft: { flex: 1 },
  tfkCTATitle: {
    fontSize: 16, fontWeight: '700' as const,
    color: TFK_ED.textWhite,
    marginBottom: 3,
  },
  tfkCTASub: {
    fontSize: 13,
    color: TFK_ED.textMuted,
  },

  // ── Info label (unused now but kept for compat) ───────────────────
  infoLabel: {
    fontSize: 11, fontWeight: '600' as const,
    color: TFK_ED.purple,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 2,
  },
}));
