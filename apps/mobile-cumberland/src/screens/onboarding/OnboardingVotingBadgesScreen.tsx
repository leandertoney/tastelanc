import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors, radius } from '../../constants/colors';
import { BRAND } from '../../config/brand';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingVotingBadges'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Demo restaurants for the leaderboard animation (percentages instead of vote counts)
const LEADERBOARD_RESTAURANTS = [
  { name: "American Bar & Grill", percentage: 42, emoji: '🍗' },
  { name: "Horse Inn", percentage: 32, emoji: '🍗' },
  { name: "Shot & Bottle", percentage: 26, emoji: '🍗' },
];

const BADGE_TIERS = [
  { id: 'top_pick', icon: 'trophy', label: 'TOP PICK', color: '#FFD700' },
  { id: 'leading_pick', icon: 'medal', label: 'LEADING PICK', color: '#C0C0C0' },
  { id: 'local_favorite', icon: 'star', label: 'LOCAL FAVORITE', color: colors.accent },
];

export default function OnboardingVotingBadgesScreen({ navigation }: Props) {
  const [displayedVotes, setDisplayedVotes] = useState([0, 0, 0]);
  const [showBadges, setShowBadges] = useState(false);
  const [showRestaurantCard, setShowRestaurantCard] = useState(false);

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);

  // Leaderboard animations
  const leaderboardOpacity = useSharedValue(0);
  const leaderboardScale = useSharedValue(0.9);

  // Individual row animations
  const rowAnimations = LEADERBOARD_RESTAURANTS.map(() => ({
    opacity: useSharedValue(0),
    translateX: useSharedValue(-50),
    scale: useSharedValue(1),
  }));

  // Vote counter animation progress
  const voteProgress = useSharedValue(0);

  // Badge award animations
  const badgeAnimations = BADGE_TIERS.map(() => ({
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
    rotate: useSharedValue(-180),
  }));

  // Winner highlight
  const winnerGlow = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);

  // Restaurant card with badge demo
  const restaurantCardOpacity = useSharedValue(0);
  const restaurantCardTranslate = useSharedValue(30);
  const badgeOnCardScale = useSharedValue(0);

  // Footer button
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(30);

  // Animate percentage counts
  const animateVotes = () => {
    const duration = 1500;
    const steps = 30;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setDisplayedVotes([
        Math.round(LEADERBOARD_RESTAURANTS[0].percentage * progress),
        Math.round(LEADERBOARD_RESTAURANTS[1].percentage * progress),
        Math.round(LEADERBOARD_RESTAURANTS[2].percentage * progress),
      ]);

      if (step >= steps) {
        clearInterval(timer);
      }
    }, interval);
  };

  useEffect(() => {
    // Header entrance
    headerOpacity.value = withTiming(1, { duration: 500 });
    headerTranslate.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });

    // Leaderboard container entrance
    leaderboardOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
    leaderboardScale.value = withDelay(300, withSpring(1, { damping: 15 }));

    // Staggered row entrance
    rowAnimations.forEach((anim, index) => {
      const delay = 500 + index * 150;
      anim.opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
      anim.translateX.value = withDelay(delay, withSpring(0, { damping: 15 }));
    });

    // Start vote counting animation
    setTimeout(() => {
      animateVotes();
    }, 1000);

    // Award badges after counting
    setTimeout(() => {
      setShowBadges(true);
      badgeAnimations.forEach((anim, index) => {
        const delay = index * 200;
        anim.opacity.value = withDelay(delay, withTiming(1, { duration: 300 }));
        anim.scale.value = withDelay(delay, withSpring(1, { damping: 8, stiffness: 150 }));
        anim.rotate.value = withDelay(delay, withSpring(0, { damping: 12 }));
      });

      // Winner glow effect
      winnerGlow.value = withDelay(600, withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        3,
        true
      ));

      // Scale up winner row
      rowAnimations[0].scale.value = withDelay(300, withSpring(1.02, { damping: 10 }));
    }, 2800);

    // Confetti celebration
    setTimeout(() => {
      confettiOpacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(1200, withTiming(0, { duration: 500 }))
      );
    }, 3200);

    // Show restaurant card with badge
    setTimeout(() => {
      setShowRestaurantCard(true);
      restaurantCardOpacity.value = withTiming(1, { duration: 400 });
      restaurantCardTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });

      // Badge appears on card
      badgeOnCardScale.value = withDelay(400, withSpring(1, { damping: 8, stiffness: 150 }));
    }, 4500);

    // Show continue button
    setTimeout(() => {
      buttonOpacity.value = withTiming(1, { duration: 400 });
      buttonTranslate.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    }, 5500);
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  const leaderboardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: leaderboardOpacity.value,
    transform: [{ scale: leaderboardScale.value }],
  }));

  const confettiAnimatedStyle = useAnimatedStyle(() => ({
    opacity: confettiOpacity.value,
  }));

  const restaurantCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: restaurantCardOpacity.value,
    transform: [{ translateY: restaurantCardTranslate.value }],
  }));

  const badgeOnCardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeOnCardScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingReviewAsk');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.headerSection, headerAnimatedStyle]}>
          <Text style={styles.headline}>Winners Wear the Crown</Text>
          <Text style={styles.subheadline}>
            At the end of each month, we count the votes{'\n'}and pick the winners
          </Text>
        </Animated.View>

        {/* Leaderboard Demo */}
        <Animated.View style={[styles.leaderboardContainer, leaderboardAnimatedStyle]}>
          <View style={styles.leaderboardHeader}>
            <Ionicons name="podium" size={18} color="#FFD700" />
            <Text style={styles.leaderboardTitle}>Best Wings • November</Text>
          </View>

          {LEADERBOARD_RESTAURANTS.map((restaurant, index) => {
            const rowAnimatedStyle = useAnimatedStyle(() => ({
              opacity: rowAnimations[index].opacity.value,
              transform: [
                { translateX: rowAnimations[index].translateX.value },
                { scale: rowAnimations[index].scale.value },
              ],
            }));

            const badgeAnimatedStyle = useAnimatedStyle(() => ({
              opacity: badgeAnimations[index].opacity.value,
              transform: [
                { scale: badgeAnimations[index].scale.value },
                { rotate: `${badgeAnimations[index].rotate.value}deg` },
              ],
            }));

            const glowStyle = useAnimatedStyle(() => ({
              shadowOpacity: index === 0 ? winnerGlow.value * 0.6 : 0,
              borderColor: index === 0 && showBadges
                ? `rgba(255, 215, 0, ${0.3 + winnerGlow.value * 0.4})`
                : 'transparent',
            }));

            const tier = BADGE_TIERS[index];

            return (
              <Animated.View
                key={restaurant.name}
                style={[
                  styles.leaderboardRow,
                  rowAnimatedStyle,
                  index === 0 && styles.winnerRow,
                  glowStyle,
                ]}
              >
                {/* Rank */}
                <View style={[styles.rankBadge, { backgroundColor: tier.color + '20' }]}>
                  <Text style={[styles.rankText, { color: tier.color }]}>
                    {index + 1}
                  </Text>
                </View>

                {/* Restaurant Info */}
                <View style={styles.restaurantInfo}>
                  <Text style={styles.emoji}>{restaurant.emoji}</Text>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                </View>

                {/* Percentage */}
                <View style={styles.voteCountContainer}>
                  <Text style={styles.voteCount}>{displayedVotes[index]}%</Text>
                </View>

                {/* Badge Award Animation */}
                {showBadges && (
                  <Animated.View style={[styles.awardBadge, badgeAnimatedStyle]}>
                    <View style={[styles.badgeCircle, { backgroundColor: tier.color }]}>
                      <Ionicons name={tier.icon as any} size={16} color={colors.text} />
                    </View>
                  </Animated.View>
                )}
              </Animated.View>
            );
          })}

          {/* Confetti */}
          <Animated.View style={[styles.confetti, confettiAnimatedStyle]}>
            <Text style={styles.confettiEmoji}>🎉</Text>
            <Text style={styles.confettiEmoji}>✨</Text>
            <Text style={styles.confettiEmoji}>🏆</Text>
            <Text style={styles.confettiEmoji}>✨</Text>
            <Text style={styles.confettiEmoji}>🎉</Text>
          </Animated.View>
        </Animated.View>

        {/* Result: Restaurant Card with Badge */}
        {showRestaurantCard && (
          <Animated.View style={[styles.resultSection, restaurantCardAnimatedStyle]}>
            <Text style={styles.resultLabel}>BADGE DISPLAYED ON LISTING</Text>
            <View style={styles.mockRestaurantCard}>
              {/* Badge positioned on card */}
              <Animated.View style={[styles.cardBadge, badgeOnCardAnimatedStyle]}>
                <View style={styles.topPickBadge}>
                  <Ionicons name="trophy" size={14} color={colors.text} />
                  <Text style={styles.topPickText}>TOP PICK</Text>
                </View>
              </Animated.View>

              <View style={styles.cardImagePlaceholder}>
                <Text style={styles.cardImageEmoji}>🍗</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardName}>American Bar & Grill</Text>
                <View style={styles.cardMeta}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.cardAddress}>{BRAND.sampleAddress}</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Hook text */}
        <View style={styles.hookContainer}>
          <Text style={styles.hookText}>
            Help your favorite spots get{'\n'}the credit they deserve
          </Text>
        </View>
      </View>

      {/* Continue Button */}
      <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textOnAccent} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF6E7',
  },
  backButton: {
    padding: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subheadline: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  leaderboardContainer: {
    width: '100%',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  leaderboardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 15,
    elevation: 5,
  },
  winnerRow: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  restaurantInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 18,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  voteCountContainer: {
    alignItems: 'flex-end',
    marginRight: 40, // Increased to make room for badge
  },
  voteCount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  awardBadge: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -14,
  },
  badgeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confetti: {
    position: 'absolute',
    top: -10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  confettiEmoji: {
    fontSize: 24,
  },
  resultSection: {
    width: '100%',
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
  },
  mockRestaurantCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  cardBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
  },
  topPickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD700',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  topPickText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  cardImagePlaceholder: {
    height: 100,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageEmoji: {
    fontSize: 40,
  },
  cardContent: {
    padding: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAddress: {
    fontSize: 13,
    color: colors.textMuted,
  },
  hookContainer: {
    paddingHorizontal: 16,
  },
  hookText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueText: {
    color: colors.textOnAccent,
    fontSize: 17,
    fontWeight: '600',
  },
});
