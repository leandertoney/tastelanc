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

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingRewards'>;

const LEADERBOARD = [
  { rank: 1, name: 'Sarah M.', pts: '2,450', medal: '#FFD700' },
  { rank: 2, name: 'James T.', pts: '1,820', medal: '#C0C0C0' },
  { rank: 3, name: 'Olivia K.', pts: '1,350', medal: '#CD7F32' },
];

export default function OnboardingRewardsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();

  // Points counter animation
  const pointsValue = useSharedValue(0);
  const pointsOpacity = useSharedValue(0);
  const pointsScale = useSharedValue(0.8);

  // Leaderboard rows cascade
  const rows = LEADERBOARD.map(() => ({
    opacity: useSharedValue(0),
    translateX: useSharedValue(-40),
  }));

  // Check-in button entrance
  const btnOpacity = useSharedValue(0);
  const btnScale = useSharedValue(0.85);

  // Floating star
  const starRotate = useSharedValue(0);
  const starOpacity = useSharedValue(0);
  const starFloat = useSharedValue(0);

  // Trophy glow
  const trophyGlow = useSharedValue(0.2);

  useEffect(() => {
    trackScreenView('OnboardingStep_Rewards');

    // Points counter pops in
    pointsOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    pointsScale.value = withDelay(300, withSpring(1, { damping: 10, stiffness: 120 }));

    // Leaderboard rows slide in
    LEADERBOARD.forEach((_, i) => {
      const delay = 600 + i * 150;
      rows[i].opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
      rows[i].translateX.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 100 }));
    });

    // Check-in button
    btnOpacity.value = withDelay(1100, withTiming(1, { duration: 400 }));
    btnScale.value = withDelay(1100, withSpring(1, { damping: 12, stiffness: 100 }));

    // Floating star
    starOpacity.value = withDelay(200, withTiming(0.15, { duration: 800 }));
    starRotate.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1, false
    );
    starFloat.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
        withTiming(8, { duration: 2500, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );

    // Trophy glow pulse
    trophyGlow.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200 }),
        withTiming(0.2, { duration: 1200 })
      ), -1, true
    );
  }, []);

  const pointsStyle = useAnimatedStyle(() => ({
    opacity: pointsOpacity.value,
    transform: [{ scale: pointsScale.value }],
  }));
  const rowStyles = rows.map(r => useAnimatedStyle(() => ({
    opacity: r.opacity.value,
    transform: [{ translateX: r.translateX.value }],
  })));
  const btnStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ scale: btnScale.value }],
  }));
  const starStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
    transform: [{ rotate: `${starRotate.value}deg` }, { translateY: starFloat.value }],
  }));
  const trophyStyle = useAnimatedStyle(() => ({
    opacity: trophyGlow.value,
  }));

  return (
    <FeatureDemoScreen
      headline="Get Rewarded for Going Out"
      subheadline={`Earn points just for doing what you love.\nRedeem perks at your favorite spots.`}
      gradientColors={[colors.primary, colors.primary, colors.primary]}
      headlineShadowColor="#DAA520"
      progressStep={7}
      totalProgressSteps={15}
      onContinue={() => navigation.navigate('Main')}
    >
      {/* Floating star */}
      <Animated.View style={[styles.floatingStar, starStyle]}>
        <Ionicons name="star" size={50} color="#FFD700" />
      </Animated.View>

      {/* Points display */}
      <Animated.View style={[styles.pointsCard, pointsStyle]}>
        <Animated.View style={[styles.trophyGlow, trophyStyle]} />
        <Ionicons name="trophy" size={28} color="#FFD700" />
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsLabel}>Your Points</Text>
          <Text style={styles.pointsNumber}>1,250</Text>
        </View>
        <View style={styles.multiplierBadge}>
          <Text style={styles.multiplierText}>2.5x</Text>
        </View>
      </Animated.View>

      {/* Leaderboard */}
      <View style={styles.leaderboard}>
        {LEADERBOARD.map((entry, i) => (
          <Animated.View key={i} style={[styles.leaderRow, rowStyles[i]]}>
            <View style={[styles.medalCircle, { backgroundColor: entry.medal + '25' }]}>
              <Text style={[styles.medalRank, { color: entry.medal }]}>#{entry.rank}</Text>
            </View>
            <Text style={styles.leaderName}>{entry.name}</Text>
            <Text style={styles.leaderPts}>{entry.pts}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Check-in button */}
      <Animated.View style={[styles.checkinBtn, { backgroundColor: '#DAA520' }, btnStyle]}>
        <Ionicons name="location" size={18} color="#FFFFFF" />
        <Text style={styles.checkinText}>Check In  +50 pts</Text>
      </Animated.View>
    </FeatureDemoScreen>
  );
}

const useStyles = createLazyStyles((colors) => ({
  floatingStar: {
    position: 'absolute' as const,
    top: -35,
    left: 0,
  },
  pointsCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.1)',
    borderLeftWidth: 6,
    borderLeftColor: '#DAA520',
    gap: 12,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  trophyGlow: {
    position: 'absolute' as const,
    top: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFD700',
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.5,
    marginBottom: 2,
  },
  pointsNumber: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#DAA520',
  },
  multiplierBadge: {
    backgroundColor: 'rgba(218,165,32,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  multiplierText: {
    fontSize: 14,
    fontWeight: '800' as const,
    color: '#DAA520',
  },
  leaderboard: {
    width: '100%',
    gap: 8,
    marginBottom: 14,
  },
  leaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  medalCircle: {
    width: 32,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  medalRank: {
    fontSize: 13,
    fontWeight: '800' as const,
  },
  leaderName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    flex: 1,
  },
  leaderPts: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
    opacity: 0.5,
  },
  checkinBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  checkinText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
}));
