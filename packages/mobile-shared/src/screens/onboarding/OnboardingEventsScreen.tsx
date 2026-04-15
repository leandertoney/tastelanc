import { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import FeatureDemoScreen from '../../components/FeatureDemoScreen';
import { trackScreenView } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingEvents'>;

const { width: SW } = Dimensions.get('window');

const CATEGORIES = [
  { icon: 'musical-notes', label: 'Live Music' },
  { icon: 'bulb', label: 'Trivia' },
  { icon: 'mic', label: 'Comedy' },
  { icon: 'trophy', label: 'Sports' },
];

const EVENTS_BY_MARKET: Record<string, Array<{ name: string; venue: string; when: string; favorited: boolean }>> = {
  'lancaster-pa': [
    { name: 'Friday Live Music', venue: 'Marion Court Room', when: 'Tonight', favorited: true },
    { name: 'Bar Trivia Night', venue: 'Lucky Dog Cafe', when: 'Tomorrow', favorited: true },
  ],
  'cumberland-pa': [
    { name: 'Live Band Night', venue: 'Market Cross Pub', when: 'Tonight', favorited: true },
    { name: 'Trivia Night', venue: 'Caddy Shack', when: 'Tomorrow', favorited: true },
  ],
  'fayetteville-nc': [
    { name: 'Friday Live Music', venue: '316 Oyster Bar', when: 'Tonight', favorited: true },
    { name: 'Trivia Night', venue: '22 Klicks Bar & Grill', when: 'Tomorrow', favorited: true },
  ],
};

export default function OnboardingEventsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const EVENTS = EVENTS_BY_MARKET[brand.marketSlug] || EVENTS_BY_MARKET['lancaster-pa'];

  // Floating category chips
  const chipScales = CATEGORIES.map(() => useSharedValue(0));
  const chipOpacities = CATEGORIES.map(() => useSharedValue(0));

  // Event cards
  const event0 = useSharedValue(0);
  const event0Y = useSharedValue(40);
  const event1 = useSharedValue(0);
  const event1Y = useSharedValue(40);

  // Ambient music notes floating
  const noteFloat = useSharedValue(0);
  const noteOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_Events');

    // Category chips pop in with stagger
    CATEGORIES.forEach((_, i) => {
      const delay = 400 + i * 120;
      chipScales[i].value = withDelay(delay, withSpring(1, { damping: 10, stiffness: 150 }));
      chipOpacities[i].value = withDelay(delay, withTiming(1, { duration: 300 }));
    });

    // Event cards slide up
    event0.value = withDelay(800, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    event0Y.value = withDelay(800, withSpring(0, { damping: 16, stiffness: 90 }));
    event1.value = withDelay(1000, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    event1Y.value = withDelay(1000, withSpring(0, { damping: 16, stiffness: 90 }));

    // Floating notes
    noteOpacity.value = withDelay(600, withTiming(0.12, { duration: 800 }));
    noteFloat.value = withRepeat(
      withSequence(
        withTiming(-15, { duration: 2800, easing: Easing.inOut(Easing.sin) }),
        withTiming(15, { duration: 2800, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  const chipStyles = CATEGORIES.map((_, i) =>
    useAnimatedStyle(() => ({
      opacity: chipOpacities[i].value,
      transform: [{ scale: chipScales[i].value }],
    }))
  );

  const event0Style = useAnimatedStyle(() => ({ opacity: event0.value, transform: [{ translateY: event0Y.value }] }));
  const event1Style = useAnimatedStyle(() => ({ opacity: event1.value, transform: [{ translateY: event1Y.value }] }));
  const noteStyle = useAnimatedStyle(() => ({ opacity: noteOpacity.value, transform: [{ translateY: noteFloat.value }] }));

  return (
    <FeatureDemoScreen
      headline="Never Miss a Beat"
      subheadline={`Live music, trivia, comedy — every night\nworth going out for.`}
      gradientColors={[colors.primary, colors.primary, colors.primary]}
      headlineShadowColor={colors.error}
      progressStep={3}
      totalProgressSteps={15}
      onContinue={() => navigation.navigate('OnboardingSpecials')}
    >
      {/* Floating music notes */}
      <Animated.View style={[styles.floatingNote, styles.noteLeft, noteStyle]}>
        <Ionicons name="musical-notes" size={48} color={colors.error} />
      </Animated.View>
      <Animated.View style={[styles.floatingNote, styles.noteRight, noteStyle]}>
        <Ionicons name="musical-note" size={32} color={colors.error} style={{ opacity: 0.6 }} />
      </Animated.View>

      {/* Category chips scattered */}
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat, i) => (
          <Animated.View key={cat.label} style={[styles.chip, chipStyles[i]]}>
            <Ionicons name={cat.icon as any} size={14} color={colors.error} />
            <Text style={styles.chipText}>{cat.label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Event cards */}
      <View style={styles.eventsStack}>
        {EVENTS.map((event, i) => (
          <Animated.View key={i} style={[styles.eventCard, i === 0 ? event0Style : event1Style]}>
            <View style={styles.eventTop}>
              <View style={styles.whenBadge}>
                <Text style={styles.whenText}>{event.when}</Text>
              </View>
              {event.favorited && (
                <Ionicons name="heart" size={22} color={colors.error} />
              )}
            </View>
            <Text style={styles.eventName}>{event.name}</Text>
            <Text style={styles.eventVenue}>{event.venue}</Text>
          </Animated.View>
        ))}
      </View>
    </FeatureDemoScreen>
  );
}

const useStyles = createLazyStyles((colors) => ({
  floatingNote: {
    position: 'absolute' as const,
  },
  noteLeft: {
    top: -30,
    left: -5,
  },
  noteRight: {
    top: 10,
    right: 0,
  },
  chipsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#1A2838',
  },
  eventsStack: {
    width: '100%',
    gap: 10,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.1)',
    borderLeftWidth: 6,
    borderLeftColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  eventTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  whenBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  whenText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#1A2838',
    opacity: 0.9,
  },
  eventName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#1A2838',
    marginBottom: 3,
  },
  eventVenue: {
    fontSize: 14,
    color: '#1A2838',
    opacity: 0.6,
  },
}));
