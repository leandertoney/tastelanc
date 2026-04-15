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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingHappyHours'>;

const { width: SW } = Dimensions.get('window');

const DEALS_BY_MARKET: Record<string, Array<{ name: string; deal: string; time: string; color: string }>> = {
  'lancaster-pa': [
    { name: 'The Imperial', deal: 'Half Off Bar Menu', time: '4–7 PM', color: '#FFB347' },
    { name: 'Marion Court Room', deal: '$2 Tacos, $5 Nachos', time: '5–7 PM', color: '#FF6B6B' },
    { name: 'Lucky Dog Cafe', deal: '$6 Cheesesteak Eggrolls', time: '4–6 PM', color: '#4ECDC4' },
  ],
  'cumberland-pa': [
    { name: 'Back Porch Brewing', deal: 'Half Off Appetizers', time: '4–7 PM', color: '#FFB347' },
    { name: 'Caddy Shack', deal: '$3 Sliders, $5 Wings', time: '5–7 PM', color: '#FF6B6B' },
    { name: 'Market Cross Pub', deal: '$6 Nachos', time: '4–6 PM', color: '#4ECDC4' },
  ],
  'fayetteville-nc': [
    { name: '316 Oyster Bar', deal: 'Half Off Small Plates', time: '4–7 PM', color: '#FFB347' },
    { name: '22 Klicks Bar & Grill', deal: '$3 Tacos, $5 Flatbreads', time: '5–7 PM', color: '#FF6B6B' },
    { name: 'Bad Daddy\'s Burger Bar', deal: '$6 Loaded Fries', time: '4–6 PM', color: '#4ECDC4' },
  ],
};

export default function OnboardingHappyHoursScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const DEALS = DEALS_BY_MARKET[brand.marketSlug] || DEALS_BY_MARKET['lancaster-pa'];

  // Staggered card entrances
  const card0 = useSharedValue(0);
  const card1 = useSharedValue(0);
  const card2 = useSharedValue(0);
  const cardTranslate0 = useSharedValue(60);
  const cardTranslate1 = useSharedValue(60);
  const cardTranslate2 = useSharedValue(60);

  // Floating beer icon
  const beerFloat = useSharedValue(0);
  const beerRotate = useSharedValue(-8);
  const beerOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_HappyHours');

    // Cards cascade in from below
    card0.value = withDelay(400, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    cardTranslate0.value = withDelay(400, withSpring(0, { damping: 16, stiffness: 90 }));
    card1.value = withDelay(550, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    cardTranslate1.value = withDelay(550, withSpring(0, { damping: 16, stiffness: 90 }));
    card2.value = withDelay(700, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    cardTranslate2.value = withDelay(700, withSpring(0, { damping: 16, stiffness: 90 }));

    // Floating beer icon
    beerOpacity.value = withDelay(300, withTiming(0.15, { duration: 800 }));
    beerFloat.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(12, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
    beerRotate.value = withRepeat(
      withSequence(
        withTiming(8, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-8, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  const cardStyles = [
    useAnimatedStyle(() => ({ opacity: card0.value, transform: [{ translateY: cardTranslate0.value }] })),
    useAnimatedStyle(() => ({ opacity: card1.value, transform: [{ translateY: cardTranslate1.value }] })),
    useAnimatedStyle(() => ({ opacity: card2.value, transform: [{ translateY: cardTranslate2.value }] })),
  ];
  const beerStyle = useAnimatedStyle(() => ({
    opacity: beerOpacity.value,
    transform: [{ translateY: beerFloat.value }, { rotate: `${beerRotate.value}deg` }],
  }));

  return (
    <FeatureDemoScreen
      headline="Great Deals Find You"
      subheadline={`Daily specials, no searching\nJust show up`}
      gradientColors={[colors.primary, colors.primary, colors.primary]}
      headlineShadowColor={colors.accent}
      progressStep={2}
      totalProgressSteps={15}
      onContinue={() => navigation.navigate('OnboardingEvents')}
    >
      {/* Ambient floating time icon */}
      <Animated.View style={[styles.floatingIcon, styles.floatingBeer, beerStyle]}>
        <Ionicons name="time" size={80} color={colors.accent} />
      </Animated.View>

      {/* Deal cards */}
      <View style={styles.cardsStack}>
        {DEALS.map((deal, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dealCard,
              { borderLeftColor: deal.color, shadowColor: deal.color },
              cardStyles[i],
            ]}
          >
            <View style={styles.dealRow}>
              <View style={styles.dealInfo}>
                <Text style={styles.dealName}>{deal.name}</Text>
                <Text style={[styles.dealOffer, { color: deal.color }]}>{deal.deal}</Text>
              </View>
              <View style={[styles.timeBadge, { backgroundColor: `${deal.color}18` }]}>
                <Ionicons name="time-outline" size={12} color={deal.color} />
                <Text style={[styles.timeText, { color: deal.color }]}>{deal.time}</Text>
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    </FeatureDemoScreen>
  );
}

const useStyles = createLazyStyles((colors) => ({
  floatingIcon: {
    position: 'absolute' as const,
  },
  floatingBeer: {
    top: -20,
    right: -10,
  },
  cardsStack: {
    width: '100%',
    gap: 12,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.1)',
    borderLeftWidth: 6,
    borderLeftColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  dealRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
  },
  dealInfo: {
    flex: 1,
  },
  dealName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1A2838',
    opacity: 0.7,
    marginBottom: 3,
  },
  dealOffer: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  timeBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
}));
