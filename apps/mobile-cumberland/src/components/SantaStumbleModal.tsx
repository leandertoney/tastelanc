import { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, spacing } from '../constants/colors';
import { features } from '../constants/features';
import { santaStumble } from '../constants/santaStumble';

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigateToRestaurant: (id: string) => void;
  flyerMode?: boolean;
};

export default function SantaStumbleModal({
  visible,
  onClose,
  onNavigateToRestaurant,
  flyerMode = features.eventFlyerEnabled,
}: Props) {
  const palette = flyerMode ? santaStumble.theme : undefined;
  const handleTicketPress = useCallback(async () => {
    try {
      await Linking.openURL(santaStumble.ticketUrl);
    } catch (error) {
      console.warn('Unable to open ticket link', error);
    }
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <ImageBackground
          source={require('../../assets/images/events/santa_stumble.png')}
          style={styles.imageBg}
          resizeMode="cover"
        >
          <LinearGradient
            colors={
              flyerMode
                ? [
                    `${palette?.primary || '#0F2C4C'}CC`,
                    `${palette?.secondary || '#0A1E36'}E6`,
                  ]
                : ['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.85)']
            }
            style={styles.gradientOverlay}
          >
            <View style={styles.snowLayer}>
              {SNOW_DOTS.map((dot) => (
                <View
                  key={dot.key}
                  style={[
                    styles.snowDot,
                    { top: dot.top, left: dot.left, opacity: dot.opacity, transform: [{ scale: dot.scale }] },
                  ]}
                />
              ))}
            </View>
            <View style={[styles.sheet, flyerMode && styles.sheetFlyer, flyerMode && palette && { borderColor: palette.accent }]}>
              <View style={styles.header}>
                <View>
                  <View style={styles.titleRow}>
                    <Ionicons name={flyerMode ? 'sparkles' : 'snow'} size={18} color={palette?.accent || colors.accent} />
                    <Text style={styles.title}>{santaStumble.name}</Text>
                  </View>
                  <Text style={styles.subtitle}>City-wide holiday bar crawl</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={12} accessibilityLabel="Close modal">
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {flyerMode ? (
                  <View style={[styles.heroCard, palette && { backgroundColor: `${palette.primary}AA`, borderColor: palette.accent }]}>
                    <View style={[styles.heroImageFrame, palette && { borderColor: palette.accent }]}>
                      <ImageBackground
                        source={require('../../assets/images/events/santa_stumble.png')}
                        style={styles.heroImage}
                        imageStyle={styles.heroImageInner}
                      />
                    </View>
                    <View style={styles.heroDetails}>
                      <View style={styles.pillsRow}>
                        <View
                          style={[
                            styles.pill,
                            styles.pillFlyer,
                            palette && { borderColor: palette.accent, backgroundColor: 'rgba(255,255,255,0.12)' },
                          ]}
                        >
                          <Ionicons name="calendar-outline" size={14} color={palette?.accent || colors.text} />
                          <Text style={[styles.pillText, palette && { color: palette.accent || colors.text }]}>
                            {santaStumble.dateLabel}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.pill,
                            styles.pillFlyer,
                            palette && { borderColor: palette.accent, backgroundColor: 'rgba(255,255,255,0.12)' },
                          ]}
                        >
                          <Ionicons name="time-outline" size={14} color={palette?.accent || colors.text} />
                          <Text style={[styles.pillText, palette && { color: palette.accent || colors.text }]}>
                            {santaStumble.timeLabel}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.badgeRow}>
                        <View style={[styles.flyerBadge, palette && { backgroundColor: palette.accent }]}>
                          <Ionicons name="ribbon" size={12} color={palette?.textOnAccent || colors.text} />
                          <Text style={[styles.flyerBadgeText, palette && { color: palette.textOnAccent || colors.text }]}>
                            21+ Event
                          </Text>
                        </View>
                        <View style={[styles.flyerBadge, styles.flyerBadgeAlt, palette && { backgroundColor: palette.badge }]}>
                          <Ionicons name="pricetag" size={12} color={palette?.textOnAccent || colors.text} />
                          <Text style={[styles.flyerBadgeText, palette && { color: palette.textOnAccent || colors.text }]}>
                            Costume Contest 8:00
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.pillsRow}>
                    <View style={styles.pill}>
                      <Ionicons name="calendar-outline" size={14} color={colors.text} />
                      <Text style={styles.pillText}>{santaStumble.dateLabel}</Text>
                    </View>
                    <View style={styles.pill}>
                      <Ionicons name="time-outline" size={14} color={colors.text} />
                      <Text style={styles.pillText}>{santaStumble.timeLabel}</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    flyerMode && styles.ctaButtonFlyer,
                    flyerMode &&
                      palette && {
                        backgroundColor: palette.cta,
                        borderColor: palette.accent,
                      },
                  ]}
                  onPress={handleTicketPress}
                  activeOpacity={0.9}
                >
                  <Ionicons name="ticket-outline" size={18} color={palette?.textOnCta || colors.text} />
                  <Text style={[styles.ctaText, palette && { color: palette.textOnCta || colors.text }]}>
                    CLICK HERE TO PURCHASE TICKETS
                  </Text>
                  <Ionicons name="open-outline" size={16} color={palette?.textOnCta || colors.text} />
                </TouchableOpacity>

                <Text style={styles.description}>{santaStumble.description}</Text>
                <Text style={styles.helperText}>{santaStumble.ageRestriction}</Text>

                <View style={[styles.section, flyerMode && styles.sectionFlyer, flyerMode && palette && { borderColor: palette.accent }]}>
                  <Text style={styles.sectionTitle}>Charities</Text>
                  {santaStumble.charities.map((charity) => (
                    <View key={charity} style={styles.listRow}>
                      <View style={styles.bullet} />
                      <Text style={styles.listText}>{charity}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.section, flyerMode && styles.sectionFlyer, flyerMode && palette && { borderColor: palette.accent }]}>
                  <Text style={styles.sectionTitle}>Costume Contest</Text>
                  <Text style={styles.listText}>{santaStumble.costumeNote}</Text>
                </View>

                <View style={[styles.section, flyerMode && styles.sectionFlyer, flyerMode && palette && { borderColor: palette.accent }]}>
                  <Text style={styles.sectionTitle}>Button Pick-up</Text>
                  <Text style={styles.helperText}>{santaStumble.pickupWindowNote}</Text>
                  {santaStumble.pickupEvents.map((pickup) => (
                    <TouchableOpacity
                      key={`${pickup.day}-${pickup.location}`}
                      style={styles.listRow}
                      activeOpacity={pickup.restaurantId ? 0.8 : 1}
                      onPress={
                        pickup.restaurantId ? () => onNavigateToRestaurant(pickup.restaurantId!) : undefined
                      }
                      disabled={!pickup.restaurantId}
                    >
                      <Ionicons name="pin-outline" size={16} color={palette?.accent || colors.textMuted} />
                      <Text style={styles.listText}>
                        {pickup.day} - {pickup.location} ({pickup.time})
                      </Text>
                      {pickup.restaurantId && (
                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.helperText}>{santaStumble.extraPickupNote}</Text>
                </View>

                <View style={[styles.section, flyerMode && styles.sectionFlyer, flyerMode && palette && { borderColor: palette.accent }]}>
                  <Text style={styles.sectionTitle}>Stumble Schedule</Text>
                  {santaStumble.schedule.map((item) => (
                    <View key={item} style={styles.listRow}>
                      <Ionicons name="walk-outline" size={16} color={palette?.cta || colors.textMuted} />
                      <Text style={styles.listText}>{item}</Text>
                    </View>
                  ))}
                </View>

                <View style={[styles.section, flyerMode && styles.sectionFlyer]}>
                  <Text style={styles.sectionTitle}>Participating Bars</Text>
                  <Text style={styles.helperText}>Tap a bar to jump to its detail page.</Text>
                  {santaStumble.participatingBars.map((bar) => (
                    <TouchableOpacity
                      key={bar.name}
                      style={styles.barRow}
                      activeOpacity={bar.restaurantId ? 0.8 : 1}
                      onPress={bar.restaurantId ? () => onNavigateToRestaurant(bar.restaurantId!) : undefined}
                      disabled={!bar.restaurantId}
                    >
                      <View style={styles.barNameRow}>
                        <Ionicons
                          name={bar.restaurantId ? 'location-outline' : 'alert-circle-outline'}
                          size={16}
                          color={bar.restaurantId ? colors.accent : colors.textMuted}
                        />
                        <Text style={[styles.barName, !bar.restaurantId && styles.barNameDisabled]}>
                          {bar.name}
                          {bar.note ? ` - ${bar.note}` : ''}
                        </Text>
                      </View>
                      {bar.restaurantId && (
                        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  ))}
                  <Text style={styles.helperText}>
                    We will link Casa Blanca Event Space once it is in the app.
                  </Text>
                </View>
              </ScrollView>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>
    </Modal>
  );
}

const SNOW_DOTS = [
  { key: 's1', top: 30, left: 40, opacity: 0.4, scale: 1 },
  { key: 's2', top: 80, left: 120, opacity: 0.3, scale: 0.9 },
  { key: 's3', top: 140, left: 20, opacity: 0.35, scale: 0.8 },
  { key: 's4', top: 200, left: 90, opacity: 0.5, scale: 1.2 },
  { key: 's5', top: 260, left: 160, opacity: 0.4, scale: 1 },
  { key: 's6', top: 320, left: 60, opacity: 0.25, scale: 0.7 },
  { key: 's7', top: 380, left: 180, opacity: 0.3, scale: 0.9 },
];

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  imageBg: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  snowLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  snowDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  sheet: {
    backgroundColor: 'rgba(26,26,26,0.9)',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    color: colors.text,
    fontWeight: '600',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  ctaButtonFlyer: {
    borderWidth: 1,
    borderColor: colors.goldBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaText: {
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  description: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  helperText: {
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  sectionFlyer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: colors.accent,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listText: {
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 2,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  barNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  barName: {
    color: colors.text,
    fontSize: 15,
    flex: 1,
  },
  barNameDisabled: {
    color: colors.textMuted,
  },
  sheetFlyer: {
    backgroundColor: 'rgba(20,20,20,0.8)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  heroCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  heroImageFrame: {
    width: 110,
    height: 110,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImageInner: {
    resizeMode: 'cover',
  },
  heroDetails: {
    flex: 1,
    gap: spacing.sm,
  },
  pillFlyer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: colors.accent,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  flyerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  flyerBadgeAlt: {
    backgroundColor: colors.gold,
  },
  flyerBadgeText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
