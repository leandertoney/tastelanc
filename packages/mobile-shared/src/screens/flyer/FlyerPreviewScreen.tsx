import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, FlyerDraftData } from '../../navigation/types';
import { matchVenue, checkDuplicate, getMarketId } from '../../lib/flyer';
import type { VenueMatch } from '../../lib/flyer';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { spacing, radius, typography } from '../../constants/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FlyerPreview'>;
type Route = RouteProp<RootStackParamList, 'FlyerPreview'>;

const EVENT_CATEGORIES = [
  { value: 'live_music', label: 'Live Music' },
  { value: 'dj', label: 'DJ' },
  { value: 'trivia', label: 'Trivia' },
  { value: 'karaoke', label: 'Karaoke' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'sports', label: 'Sports' },
  { value: 'promotion', label: 'Special Event' },
  { value: 'other', label: 'Other' },
];

export default function FlyerPreviewScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { flyerImageUrl, extracted } = route.params;
  const styles = useStyles();
  const colors = getColors();

  // Form state
  const [eventName, setEventName] = useState(extracted.event_name || '');
  const [venueName, setVenueName] = useState(extracted.venue_name || '');
  const [venueId, setVenueId] = useState<string | null>(null);
  const [date, setDate] = useState(extracted.date || '');
  const [timeStart, setTimeStart] = useState(extracted.time_start || '');
  const [timeEnd, setTimeEnd] = useState(extracted.time_end || '');
  const [description, setDescription] = useState(extracted.description || '');
  const [performers, setPerformers] = useState(extracted.performers || '');
  const [category, setCategory] = useState(extracted.category || 'other');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Venue search state
  const [venueSearchQuery, setVenueSearchQuery] = useState('');
  const [venueResults, setVenueResults] = useState<VenueMatch[]>([]);
  const [isSearchingVenue, setIsSearchingVenue] = useState(false);
  const venueSheetRef = useRef<BottomSheet>(null);
  const venueSnapPoints = useMemo(() => ['60%'], []);

  // Auto-match venue on mount
  useEffect(() => {
    if (extracted.venue_name) {
      autoMatchVenue(extracted.venue_name);
    }
  }, []);

  const autoMatchVenue = async (name: string) => {
    try {
      const result = await matchVenue(name);
      if (result.auto_matched && result.auto_matched_venue) {
        setVenueId(result.auto_matched_venue.id);
        setVenueName(result.auto_matched_venue.name);
      }
      if (result.matches.length > 0) {
        setVenueResults(result.matches);
      }
    } catch {
      // Silently fail auto-match
    }
  };

  const handleVenueSearch = async (query: string) => {
    setVenueSearchQuery(query);
    if (query.length < 2) {
      setVenueResults([]);
      return;
    }
    setIsSearchingVenue(true);
    try {
      const result = await matchVenue(query);
      setVenueResults(result.matches);
    } catch {
      setVenueResults([]);
    } finally {
      setIsSearchingVenue(false);
    }
  };

  const selectVenue = (venue: VenueMatch) => {
    setVenueId(venue.id);
    setVenueName(venue.name);
    venueSheetRef.current?.close();
  };

  const handleContinue = async () => {
    if (!eventName.trim()) {
      Alert.alert('Missing Info', 'Please enter an event name.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check for duplicates if we have a venue and date
      if (venueId && date) {
        const dupResult = await checkDuplicate({
          venueId,
          eventDate: date,
          eventName,
        });

        if (dupResult.is_duplicate && dupResult.existing_event) {
          Alert.alert(
            'Possible Duplicate',
            `An event "${dupResult.existing_event.name}" already exists at this venue on this date. Do you want to continue anyway?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Submit Anyway',
                onPress: () => navigateToPublishChoice(),
              },
            ]
          );
          setIsSubmitting(false);
          return;
        }
      }

      navigateToPublishChoice();
    } catch {
      navigateToPublishChoice();
    } finally {
      setIsSubmitting(false);
    }
  };

  const navigateToPublishChoice = async () => {
    const marketId = await getMarketId();

    const draftData: FlyerDraftData = {
      flyerImageUrl,
      eventName: eventName.trim(),
      venueName: venueName.trim(),
      venueId,
      date,
      timeStart,
      timeEnd,
      description: description.trim(),
      performers: performers.trim(),
      category,
      marketId,
      extractedJson: extracted,
      editedJson: {
        event_name: eventName.trim(),
        venue_name: venueName.trim(),
        date,
        time_start: timeStart,
        time_end: timeEnd,
        description: description.trim(),
        performers: performers.trim(),
        category,
      },
    };

    navigation.navigate('FlyerPublishChoice', { draftData });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Flyer Image Hero */}
          <View style={styles.imageContainer}>
            <Image source={{ uri: flyerImageUrl }} style={styles.image} resizeMode="contain" />
          </View>

          {/* Editable Fields */}
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Event Details</Text>

            <Text style={styles.label}>Event Name *</Text>
            <TextInput
              style={styles.input}
              value={eventName}
              onChangeText={setEventName}
              placeholder="Event name"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Venue</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => venueSheetRef.current?.expand()}
              activeOpacity={0.7}
            >
              <Text style={venueName ? styles.inputText : styles.placeholderText}>
                {venueName || 'Search for a venue...'}
              </Text>
              {venueId && (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              )}
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  value={timeStart}
                  onChangeText={setTimeStart}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.input}
              value={timeEnd}
              onChangeText={setTimeEnd}
              placeholder="HH:MM (optional)"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
              {EVENT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[styles.pill, category === cat.value && styles.pillActive]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, category === cat.value && styles.pillTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Performers</Text>
            <TextInput
              style={styles.input}
              value={performers}
              onChangeText={setPerformers}
              placeholder="Artist, band, or host name (optional)"
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Event description (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.continueButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Venue Search Bottom Sheet */}
      <BottomSheet
        ref={venueSheetRef}
        index={-1}
        snapPoints={venueSnapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBg}
        handleIndicatorStyle={{ backgroundColor: colors.textMuted }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Search Venue</Text>
          <BottomSheetTextInput
            style={styles.sheetInput}
            value={venueSearchQuery}
            onChangeText={handleVenueSearch}
            placeholder="Type venue name..."
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          {isSearchingVenue && <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.accent} />}
          <FlatList
            data={venueResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.venueRow} onPress={() => selectVenue(item)} activeOpacity={0.7}>
                <View style={styles.venueInfo}>
                  <Text style={styles.venueRowName}>{item.name}</Text>
                  {item.confidence >= 0.85 && (
                    <Text style={styles.venueMatch}>Best match</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              venueSearchQuery.length >= 2 && !isSearchingVenue ? (
                <Text style={styles.noResults}>No venues found</Text>
              ) : null
            }
          />
        </BottomSheetView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    height: 280,
    margin: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
    backgroundColor: colors.cardBg,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  form: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.title3,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.caption1,
    fontWeight: '600' as const,
    color: colors.textMuted,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  inputText: {
    fontSize: typography.body,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    fontSize: typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row' as const,
    gap: spacing.md,
  },
  halfField: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row' as const,
    marginTop: spacing.xs,
  },
  pill: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  pillText: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    fontWeight: '500' as const,
  },
  pillTextActive: {
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  continueButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: typography.headline,
    fontWeight: '600' as const,
    color: colors.text,
  },
  // Bottom Sheet
  sheetBg: {
    backgroundColor: colors.cardBgElevated,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  sheetTitle: {
    fontSize: typography.headline,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sheetInput: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  venueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  venueInfo: {
    flex: 1,
  },
  venueRowName: {
    fontSize: typography.body,
    color: colors.text,
    fontWeight: '500' as const,
  },
  venueMatch: {
    fontSize: typography.caption2,
    color: colors.success,
    marginTop: 2,
  },
  noResults: {
    fontSize: typography.callout,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: spacing.lg,
  },
}));
