/**
 * Instagram-Story-Worthy Itinerary Result Card
 *
 * Full-screen branded card designed to be screenshotted and shared on
 * Instagram Stories. Shows 2–3 curated stops with images, walk times,
 * and TasteCumberland branding. Users screenshot to share — no native
 * capture modules needed (OTA-compatible).
 */

import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Share,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { TimeSlot, ItineraryMood, ItineraryItemWithReason } from '../types/itinerary';
import { ITINERARY_MOODS, TIME_SLOT_CONFIG } from '../types/itinerary';
import { useSaveItinerary } from '../hooks/useItineraries';
import { colors, radius, spacing, typography } from '../constants/colors';
import { BRAND } from '../config/brand';

type Props = NativeStackScreenProps<RootStackParamList, 'ItineraryCard'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Display data maps ─────────────────────────────────────────────────────

const SLOT_DISPLAY: Record<TimeSlot, { emoji: string; label: string }> = {
  breakfast:  { emoji: '\u2600\uFE0F', label: 'Breakfast' },
  morning:    { emoji: '\u2615',       label: 'Mid-Morning' },
  lunch:      { emoji: '\uD83C\uDF7D', label: 'Lunch' },
  afternoon:  { emoji: '\uD83C\uDF24', label: 'Afternoon' },
  happy_hour: { emoji: '\uD83C\uDF7A', label: 'Happy Hour' },
  dinner:     { emoji: '\uD83C\uDF77', label: 'Dinner' },
  evening:    { emoji: '\uD83C\uDFB5', label: 'Evening' },
};

// Sequential display times per mood+slot — no overlaps
const MOOD_TIME_LABELS: Record<ItineraryMood, Partial<Record<TimeSlot, string>>> = {
  date_night:      { happy_hour: '4\u20136 PM',        dinner: '6\u20138 PM',        evening: '8 PM\u2013Late' },
  bar_crawl:       { happy_hour: '4\u20136 PM',        dinner: '6\u20138 PM',        evening: '8 PM\u2013Late' },
  foodie_tour:     { lunch: '11:30 AM\u20132 PM',      happy_hour: '4\u20136 PM',     dinner: '6\u20138 PM' },
  brunch_lover:    { morning: '10\u201311:30 AM',       lunch: '11:30 AM\u20132 PM',   afternoon: '2\u20134 PM' },
  family_day:      { lunch: '11:30 AM\u20132 PM',      afternoon: '2\u20134 PM',       dinner: '6\u20138 PM' },
  budget_friendly: { lunch: '11:30 AM\u20132 PM',      happy_hour: '4\u20136 PM',     dinner: '6\u20138 PM' },
};
const DEFAULT_TIME_LABELS: Partial<Record<TimeSlot, string>> = {
  lunch: '11:30 AM\u20132 PM', happy_hour: '4\u20136 PM', dinner: '6\u20138 PM',
};

const MOOD_TITLES: Record<ItineraryMood, string> = {
  date_night:      'YOUR DATE NIGHT',
  bar_crawl:       'YOUR BAR CRAWL',
  foodie_tour:     'YOUR FOODIE TOUR',
  brunch_lover:    'YOUR BRUNCH DAY',
  family_day:      'YOUR FAMILY DAY',
  budget_friendly: 'YOUR BUDGET BITES',
};

// Mood-specific slot label overrides
const MOOD_SLOT_OVERRIDES: Partial<Record<ItineraryMood, Partial<Record<TimeSlot, { emoji: string; label: string }>>>> = {
  bar_crawl: {
    happy_hour: { emoji: '\uD83C\uDF7A', label: 'First Round' },
    dinner:     { emoji: '\uD83E\uDD43', label: 'Drinks & Bites' },
    evening:    { emoji: '\uD83C\uDFB5', label: 'Late Night' },
  },
  date_night: {
    happy_hour: { emoji: '\uD83E\uDD42', label: 'Cocktails' },
    dinner:     { emoji: '\uD83C\uDF77', label: 'Dinner' },
    evening:    { emoji: '\uD83C\uDF19', label: 'Nightcap' },
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ItineraryCardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<Props['route']>();
  const { items, walkMinutes, mood, date } = route.params;

  const saveItineraryMutation = useSaveItinerary();

  // Format the date nicely
  const dateObj = new Date(date + 'T12:00:00');
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const moodTitle = mood ? MOOD_TITLES[mood] : `YOUR ${BRAND.cityName.toUpperCase()} DAY`;

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleShare = useCallback(async () => {
    if (items.length === 0) return;

    const moodLabel = mood ? ITINERARY_MOODS[mood].label : 'Day Out';

    let msg = `\uD83D\uDCCD ${moodLabel} in ${BRAND.cityName} \u2014 ${formattedDate}\n\n`;

    const timeLabels = mood ? MOOD_TIME_LABELS[mood] : DEFAULT_TIME_LABELS;

    items.forEach((item, i) => {
      const slot = item.time_slot as TimeSlot;
      const defaultSlot = SLOT_DISPLAY[slot];
      if (!defaultSlot) return;
      const override = mood ? MOOD_SLOT_OVERRIDES[mood]?.[slot] : undefined;
      const emoji = override?.emoji || defaultSlot.emoji;
      const label = override?.label || defaultSlot.label;
      const timeLabel = timeLabels[slot] || label;
      msg += `${emoji} ${label} \u00B7 ${timeLabel}\n`;
      msg += `   ${item.display_name}\n`;
      if (item.reason) msg += `   ${item.reason}\n`;
      if (i < items.length - 1) {
        const wm = walkMinutes[i];
        msg += wm ? `\n   \u2193 ${wm} min walk\n\n` : '\n';
      }
    });

    msg += `\n\u2500\u2500 Curated by ${BRAND.appName} \u2500\u2500\n${BRAND.appStoreUrl || BRAND.websiteUrl}`;

    try {
      await Share.share({ message: msg });
    } catch {
      // User dismissed share sheet
    }
  }, [items, mood, formattedDate, walkMinutes]);

  const handleSave = useCallback(async () => {
    if (items.length === 0) return;

    try {
      await saveItineraryMutation.mutateAsync({
        itinerary: {
          title: `${BRAND.cityName} ${mood ? ITINERARY_MOODS[mood].label : 'Day'} \u2014 ${formattedDate}`,
          date,
          is_generated: true,
        },
        items,
      });

      Alert.alert(
        'Plan Saved!',
        `Your day plan has been saved. Have a great time in ${BRAND.cityName}!`,
      );
    } catch {
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    }
  }, [items, mood, date, formattedDate, saveItineraryMutation]);

  const handleEdit = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.popToTop()}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={24} color={colors.textMuted} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Branded Card Area ─────────────────────────────────── */}
        <View style={styles.cardContainer}>
          {/* Logo */}
          <Image
            source={require('../../assets/tastelanc_1a1a1a.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Mood Title */}
          <Text style={styles.moodTitle}>{moodTitle}</Text>

          {/* Date + Location */}
          <Text style={styles.dateText}>{formattedDate}</Text>
          <Text style={styles.locationText}>{BRAND.cityName}, PA</Text>

          {/* ─── Stop Cards ───────────────────────────────────── */}
          <View style={styles.stopsContainer}>
            {items.map((item, index) => {
              const slot = item.time_slot as TimeSlot;
              const defaultSlot = SLOT_DISPLAY[slot];
              if (!defaultSlot) return null;
              const slotOverride = mood ? MOOD_SLOT_OVERRIDES[mood]?.[slot] : undefined;
              const slotEmoji = slotOverride?.emoji || defaultSlot.emoji;
              const slotLabel = slotOverride?.label || defaultSlot.label;

              return (
                <View key={item.id}>
                  {/* Stop Card */}
                  <TouchableOpacity
                    style={styles.stopCard}
                    onPress={() => {
                      if (item.restaurant_id) {
                        navigation.navigate('RestaurantDetail', { id: item.restaurant_id });
                      }
                    }}
                    activeOpacity={0.85}
                  >
                    {/* Restaurant Image */}
                    <View style={styles.stopImageContainer}>
                      {item.display_image_url ? (
                        <Image
                          source={{ uri: item.display_image_url }}
                          style={styles.stopImage}
                        />
                      ) : (
                        <View style={styles.stopImageFallback}>
                          <Ionicons
                            name="restaurant"
                            size={22}
                            color={colors.textMuted}
                          />
                        </View>
                      )}
                    </View>

                    {/* Stop Info */}
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopName} numberOfLines={1}>
                        {item.display_name}
                      </Text>
                      <Text style={styles.stopSlot}>
                        {slotEmoji} {slotLabel}
                      </Text>
                      <Text style={styles.stopTime}>
                        {(mood ? MOOD_TIME_LABELS[mood] : DEFAULT_TIME_LABELS)[slot] || slotLabel}
                      </Text>
                      {item.reason ? (
                        <Text style={styles.stopReason} numberOfLines={2}>
                          {item.reason}
                        </Text>
                      ) : null}
                    </View>

                    {/* Stop number badge */}
                    <View style={styles.stopBadge}>
                      <Text style={styles.stopBadgeText}>{index + 1}</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Walk connector between stops */}
                  {index < items.length - 1 && (
                    <View style={styles.walkConnector}>
                      <View style={styles.walkLine} />
                      {walkMinutes[index] ? (
                        <Text style={styles.walkText}>
                          {'\u2193'} {walkMinutes[index]} min walk
                        </Text>
                      ) : (
                        <Text style={styles.walkText}>
                          {'\u2193'}
                        </Text>
                      )}
                      <View style={styles.walkLine} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Footer branding */}
          <View style={styles.footerBranding}>
            <View style={styles.dividerLine} />
            <Text style={styles.curatedText}>Curated by {BRAND.appName}</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Screenshot hint */}
          <Text style={styles.screenshotHint}>
            Screenshot this card {'\u2192'} share on your Story
          </Text>
        </View>

        {/* ─── Action Buttons (outside the branded card) ──────── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color={colors.accent} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={saveItineraryMutation.isPending}
          >
            {saveItineraryMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.textOnAccent} />
            ) : (
              <Ionicons name="bookmark" size={20} color={colors.textOnAccent} />
            )}
            <Text style={[styles.actionButtonText, styles.saveButtonText]}>
              {saveItineraryMutation.isPending ? 'Saving...' : 'Save Plan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEdit}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={20} color={colors.accent} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const CARD_PADDING = spacing.lg;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: spacing.md,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15,30,46,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: spacing.xl,
    paddingBottom: 40,
  },

  // ─── Branded Card ──────────────────────────────────────────
  cardContainer: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: CARD_PADDING,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    // Accent border
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ─── Logo ──────────────────────────────────────────────────
  logo: {
    width: 120,
    height: 40,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },

  // ─── Mood Header ──────────────────────────────────────────
  moodTitle: {
    fontSize: typography.title1,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  dateText: {
    fontSize: typography.callout,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 2,
  },
  locationText: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  // ─── Stops ─────────────────────────────────────────────────
  stopsContainer: {
    gap: 0,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  stopImageContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: colors.cardBgElevated,
  },
  stopImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  stopImageFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: typography.headline,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  stopSlot: {
    fontSize: typography.subhead,
    color: colors.text,
    marginBottom: 1,
  },
  stopTime: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginBottom: 2,
  },
  stopReason: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  stopBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopBadgeText: {
    fontSize: typography.caption1,
    fontWeight: '700',
    color: colors.textOnAccent,
  },

  // ─── Walk Connector ────────────────────────────────────────
  walkConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  walkLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  walkText: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // ─── Footer Branding ──────────────────────────────────────
  footerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  curatedText: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ─── Screenshot Hint ──────────────────────────────────────
  screenshotHint: {
    fontSize: typography.caption2,
    color: 'rgba(15,30,46,0.3)',
    textAlign: 'center',
    marginTop: spacing.md,
  },

  // ─── Action Buttons ───────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardBg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  actionButtonText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.accent,
  },
  saveButton: {
    flex: 1.5,
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  saveButtonText: {
    color: colors.textOnAccent,
  },
});
