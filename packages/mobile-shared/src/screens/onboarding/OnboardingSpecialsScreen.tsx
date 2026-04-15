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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSpecials'>;

const DEALS_BY_MARKET: Record<string, Array<{ deal: string; place: string; day: string; savings: string }>> = {
  'lancaster-pa': [
    { deal: '50¢ Wing Night', place: 'The Imperial', day: 'Sundays', savings: '50¢ each' },
    { deal: 'Taco Tuesday', place: 'Marion Court Room', day: 'Tuesdays', savings: 'Weekly' },
    { deal: 'Prime Rib Dinner', place: 'Lucky Dog Cafe', day: 'Fri & Sat', savings: 'Special' },
  ],
  'cumberland-pa': [
    { deal: '50¢ Wing Night', place: 'Back Porch Brewing', day: 'Sundays', savings: '50¢ each' },
    { deal: 'Taco Tuesday', place: 'Caddy Shack', day: 'Tuesdays', savings: 'Weekly' },
    { deal: 'Weekend Specials', place: 'Market Cross Pub', day: 'Fri & Sat', savings: 'Special' },
  ],
  'fayetteville-nc': [
    { deal: '50¢ Wing Night', place: '316 Oyster Bar', day: 'Sundays', savings: '50¢ each' },
    { deal: 'Taco Tuesday', place: '22 Klicks Bar & Grill', day: 'Tuesdays', savings: 'Weekly' },
    { deal: 'Weekend Specials', place: 'Bad Daddy\'s Burger Bar', day: 'Fri & Sat', savings: 'Special' },
  ],
};

export default function OnboardingSpecialsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const DEALS = DEALS_BY_MARKET[brand.marketSlug] || DEALS_BY_MARKET['lancaster-pa'];

  // Cards cascade with rotation
  const cards = DEALS.map(() => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(50),
    rotate: useSharedValue(0),
  }));

  // Floating sparkles
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkleFloat = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_Specials');

    // Cards cascade in with slight rotation
    DEALS.forEach((_, i) => {
      const delay = 400 + i * 180;
      const rotations = [-2, 1, -1];
      cards[i].opacity.value = withDelay(delay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
      cards[i].translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 85 }));
      cards[i].rotate.value = withDelay(delay, withSpring(rotations[i], { damping: 20, stiffness: 100 }));
    });

    // Sparkle animations
    sparkle1.value = withDelay(300, withTiming(0.2, { duration: 600 }));
    sparkle2.value = withDelay(500, withTiming(0.15, { duration: 600 }));
    sparkleFloat.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  const cardStyles = cards.map(c => useAnimatedStyle(() => ({
    opacity: c.opacity.value,
    transform: [{ translateY: c.translateY.value }, { rotate: `${c.rotate.value}deg` }],
  })));

  const sparkle1Style = useAnimatedStyle(() => ({
    opacity: sparkle1.value,
    transform: [{ translateY: sparkleFloat.value }],
  }));
  const sparkle2Style = useAnimatedStyle(() => ({
    opacity: sparkle2.value,
    transform: [{ translateY: -sparkleFloat.value }],
  }));

  return (
    <FeatureDemoScreen
      headline="Daily Deals, Weekly Picks"
      subheadline={`Special savings picked\njust for ${brand.cityName}.`}
      gradientColors={[colors.primary, colors.primary, colors.primary]}
      headlineShadowColor={colors.valueGreen}
      progressStep={4}
      totalProgressSteps={15}
      onContinue={() => navigation.navigate('OnboardingMove')}
    >
      {/* Floating sparkle tags */}
      <Animated.View style={[styles.sparkleTag, styles.sparkle1, sparkle1Style]}>
        <Ionicons name="pricetag" size={40} color={colors.valueGreen} />
      </Animated.View>
      <Animated.View style={[styles.sparkleTag, styles.sparkle2, sparkle2Style]}>
        <Text style={styles.sparkleText}>💰</Text>
      </Animated.View>

      {/* Deal cards with slight rotation and glassmorphic feel */}
      <View style={styles.cardsStack}>
        {DEALS.map((deal, i) => (
          <Animated.View key={i} style={[styles.dealCard, cardStyles[i]]}>
            <View style={styles.dealHeader}>
              <Text style={styles.dealTitle}>{deal.deal}</Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>{deal.savings}</Text>
              </View>
            </View>
            <Text style={styles.dealPlace}>{deal.place}</Text>
            <View style={styles.dealFooter}>
              <Ionicons name="calendar-outline" size={12} color="#1A2838" style={{ opacity: 0.5 }} />
              <Text style={styles.dealDay}>{deal.day}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </FeatureDemoScreen>
  );
}

const useStyles = createLazyStyles((colors) => ({
  sparkleTag: {
    position: 'absolute' as const,
  },
  sparkle1: {
    top: -25,
    right: 5,
  },
  sparkle2: {
    top: 0,
    left: -5,
  },
  sparkleText: {
    fontSize: 32,
  },
  cardsStack: {
    width: '100%',
    gap: 10,
  },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.1)',
    borderLeftWidth: 6,
    borderLeftColor: colors.valueGreen,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  dealHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 6,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#1A2838',
  },
  savingsBadge: {
    backgroundColor: colors.valueGreen + '1A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: colors.valueGreen,
  },
  dealPlace: {
    fontSize: 14,
    color: '#1A2838',
    opacity: 0.6,
    marginBottom: 6,
  },
  dealFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  dealDay: {
    fontSize: 12,
    color: '#1A2838',
    opacity: 0.5,
  },
}));
