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
import { getColors } from '../../config/theme';
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

const EVENTS = [
  { name: 'Friday Live Music', venue: 'Marion Court Room', when: 'Tonight', hot: true },
  { name: 'Bar Trivia Night', venue: 'Thirsty For Knowledge', when: 'Tomorrow' },
];

export default function OnboardingEventsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();

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
      gradientColors={[colors.primary, '#1a0a2e', colors.primary]}
      progressStep={3}
      totalProgressSteps={15}
      onContinue={() => navigation.navigate('OnboardingSpecials')}
    >
      {/* Floating music notes */}
      <Animated.View style={[styles.floatingNote, styles.noteLeft, noteStyle]}>
        <Ionicons name="musical-notes" size={48} color={colors.accent} />
      </Animated.View>
      <Animated.View style={[styles.floatingNote, styles.noteRight, noteStyle]}>
        <Ionicons name="musical-note" size={32} color={`${colors.accent}60`} />
      </Animated.View>

      {/* Category chips scattered */}
      <View style={styles.chipsRow}>
        {CATEGORIES.map((cat, i) => (
          <Animated.View key={cat.label} style={[styles.chip, chipStyles[i]]}>
            <Ionicons name={cat.icon as any} size={14} color={colors.accent} />
            <Text style={styles.chipText}>{cat.label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Event cards */}
      <View style={styles.eventsStack}>
        {EVENTS.map((event, i) => (
          <Animated.View key={i} style={[styles.eventCard, event.hot && styles.eventCardHot, i === 0 ? event0Style : event1Style]}>
            <View style={styles.eventTop}>
              <View style={[styles.whenBadge, event.hot && styles.whenBadgeHot]}>
                <Text style={[styles.whenText, event.hot && styles.whenTextHot]}>{event.when}</Text>
              </View>
              {event.hot && (
                <Text style={styles.hotIcon}>🔥</Text>
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
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  eventsStack: {
    width: '100%',
    gap: 10,
  },
  eventCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  eventCardHot: {
    borderColor: `${colors.accent}40`,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  eventTop: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  whenBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  whenBadgeHot: {
    backgroundColor: `${colors.accent}25`,
  },
  whenText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
  },
  whenTextHot: {
    color: colors.accent,
  },
  hotIcon: {
    fontSize: 16,
  },
  eventName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 3,
  },
  eventVenue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
}));
