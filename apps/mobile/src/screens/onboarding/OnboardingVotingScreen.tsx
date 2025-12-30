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
  runOnJS,
  interpolateColor,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors, radius } from '../../constants/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingVoting'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VOTING_CATEGORIES = [
  { id: 'best_wings', label: 'Best Wings', emoji: '🍗', color: '#FF6B35' },
  { id: 'best_burgers', label: 'Best Burgers', emoji: '🍔', color: '#E63946' },
  { id: 'best_pizza', label: 'Best Pizza', emoji: '🍕', color: '#F4A261' },
  { id: 'best_cocktails', label: 'Best Cocktails', emoji: '🍸', color: '#9B5DE5' },
  { id: 'best_happy_hour', label: 'Best Happy Hour', emoji: '🍻', color: '#FFD700' },
  { id: 'best_brunch', label: 'Best Brunch', emoji: '🥞', color: '#F8961E' },
  { id: 'best_late_night', label: 'Best Late Night', emoji: '🌙', color: '#577590' },
  { id: 'best_live_music', label: 'Best Live Music', emoji: '🎵', color: '#43AA8B' },
];

// Demo restaurant for the animation
const DEMO_RESTAURANT = {
  name: "American Bar & Grill",
  category: "Best Wings",
};

export default function OnboardingVotingScreen({ navigation }: Props) {
  const [demoPhase, setDemoPhase] = useState<'badges' | 'selecting' | 'voting' | 'complete'>('badges');
  const [selectedBadgeIndex, setSelectedBadgeIndex] = useState(-1);

  // Animation values
  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);

  // Badge animations (staggered entrance)
  const badgeAnimations = VOTING_CATEGORIES.map(() => ({
    opacity: useSharedValue(0),
    scale: useSharedValue(0.6),
    rotate: useSharedValue(-10),
  }));

  // Demo card animations
  const demoCardOpacity = useSharedValue(0);
  const demoCardScale = useSharedValue(0.8);
  const demoCardTranslate = useSharedValue(50);

  // Vote button pulse
  const voteButtonScale = useSharedValue(1);
  const voteButtonOpacity = useSharedValue(0);

  // Checkmark animation
  const checkmarkScale = useSharedValue(0);
  const checkmarkOpacity = useSharedValue(0);

  // Confetti / celebration
  const celebrationOpacity = useSharedValue(0);

  // Footer button
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(30);

  // Selection highlight
  const selectionGlow = useSharedValue(0);

  const startDemoAnimation = () => {
    // Phase 2: Highlight a badge (simulate selection)
    setTimeout(() => {
      setDemoPhase('selecting');
      setSelectedBadgeIndex(0); // Select "Best Wings"
      selectionGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 })
        ),
        3,
        true
      );

      // Scale up selected badge
      badgeAnimations[0].scale.value = withSpring(1.1, { damping: 10 });
    }, 1800);

    // Phase 3: Show demo restaurant card
    setTimeout(() => {
      setDemoPhase('voting');
      demoCardOpacity.value = withTiming(1, { duration: 400 });
      demoCardScale.value = withSpring(1, { damping: 12 });
      demoCardTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });

      // Show vote button with pulse
      voteButtonOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
      voteButtonScale.value = withDelay(500, withRepeat(
        withSequence(
          withTiming(1.05, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        2,
        true
      ));
    }, 3000);

    // Phase 4: Simulate vote cast
    setTimeout(() => {
      setDemoPhase('complete');

      // Hide vote button, show checkmark
      voteButtonOpacity.value = withTiming(0, { duration: 200 });
      checkmarkOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
      checkmarkScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 150 }));

      // Celebration effect
      celebrationOpacity.value = withDelay(400, withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(800, withTiming(0, { duration: 500 }))
      ));

      // Show continue button
      buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
      buttonTranslate.value = withDelay(1000, withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) }));
    }, 4500);
  };

  useEffect(() => {
    // Header entrance
    headerOpacity.value = withTiming(1, { duration: 500 });
    headerTranslate.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });

    // Staggered badge entrance with rotation
    badgeAnimations.forEach((anim, index) => {
      const delay = 300 + index * 100;
      anim.opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
      anim.scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
      anim.rotate.value = withDelay(delay, withSpring(0, { damping: 15 }));
    });

    // Start demo sequence
    startDemoAnimation();
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  const demoCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: demoCardOpacity.value,
    transform: [
      { scale: demoCardScale.value },
      { translateY: demoCardTranslate.value },
    ],
  }));

  const voteButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: voteButtonOpacity.value,
    transform: [{ scale: voteButtonScale.value }],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: checkmarkOpacity.value,
    transform: [{ scale: checkmarkScale.value }],
  }));

  const celebrationAnimatedStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingVotingBadges');
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
          <View style={styles.trophyIcon}>
            <Ionicons name="trophy" size={36} color="#FFD700" />
          </View>
          <Text style={styles.headline}>Vote for Lancaster's Best</Text>
          <Text style={styles.subheadline}>
            Crown the winners in 8 categories every month
          </Text>
        </Animated.View>

        {/* Badge Grid - Award Ribbon Style */}
        <View style={styles.badgeGrid}>
          {VOTING_CATEGORIES.map((category, index) => {
            const animatedStyle = useAnimatedStyle(() => ({
              opacity: badgeAnimations[index].opacity.value,
              transform: [
                { scale: badgeAnimations[index].scale.value },
                { rotate: `${badgeAnimations[index].rotate.value}deg` },
              ],
            }));

            const isSelected = selectedBadgeIndex === index;
            const glowStyle = useAnimatedStyle(() => ({
              shadowOpacity: isSelected ? selectionGlow.value * 0.8 : 0,
              borderColor: isSelected
                ? `rgba(255, 215, 0, ${0.5 + selectionGlow.value * 0.5})`
                : 'transparent',
            }));

            return (
              <Animated.View
                key={category.id}
                style={[
                  styles.badge,
                  animatedStyle,
                  isSelected && styles.badgeSelected,
                  glowStyle,
                ]}
              >
                {/* Ribbon top */}
                <View style={[styles.ribbonTop, { backgroundColor: category.color }]}>
                  <Text style={styles.badgeEmoji}>{category.emoji}</Text>
                </View>
                {/* Badge body */}
                <View style={styles.badgeBody}>
                  <Text style={styles.badgeLabel} numberOfLines={2}>
                    {category.label.replace('Best ', '')}
                  </Text>
                </View>
                {/* Ribbon tails */}
                <View style={styles.ribbonTails}>
                  <View style={[styles.ribbonTail, styles.ribbonTailLeft, { backgroundColor: category.color }]} />
                  <View style={[styles.ribbonTail, styles.ribbonTailRight, { backgroundColor: category.color }]} />
                </View>
                {isSelected && (
                  <View style={styles.selectionIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color="#FFD700" />
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* Demo Restaurant Card */}
        <Animated.View style={[styles.demoSection, demoCardAnimatedStyle]}>
          <View style={styles.demoCard}>
            <View style={styles.demoCardHeader}>
              <Text style={styles.demoLabel}>YOUR VOTE</Text>
            </View>
            <View style={styles.demoCardContent}>
              <View style={styles.restaurantInfo}>
                <Text style={styles.categoryBadgeText}>🍗 Best Wings</Text>
                <Text style={styles.restaurantName}>{DEMO_RESTAURANT.name}</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons key={star} name="star" size={14} color="#FFD700" />
                  ))}
                </View>
              </View>

              {/* Vote Button */}
              <Animated.View style={[styles.voteButtonContainer, voteButtonAnimatedStyle]}>
                <View style={styles.voteButton}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.text} />
                  <Text style={styles.voteButtonText}>Cast Vote</Text>
                </View>
              </Animated.View>

              {/* Checkmark (after vote) */}
              <Animated.View style={[styles.checkmarkContainer, checkmarkAnimatedStyle]}>
                <View style={styles.checkmarkCircle}>
                  <Ionicons name="checkmark" size={32} color="#121212" />
                </View>
                <Text style={styles.votedText}>Vote Cast!</Text>
              </Animated.View>
            </View>
          </View>

          {/* Celebration particles */}
          <Animated.View style={[styles.celebration, celebrationAnimatedStyle]}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationEmoji}>✨</Text>
            <Text style={styles.celebrationEmoji}>🏆</Text>
          </Animated.View>
        </Animated.View>

        {/* Premium Info */}
        <View style={styles.premiumInfo}>
          <Ionicons name="star" size={16} color={colors.accent} />
          <Text style={styles.premiumText}>4 votes per month • Included</Text>
        </View>
      </View>

      {/* Continue Button */}
      <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>See Winner Badges</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const BADGE_SIZE = (SCREEN_WIDTH - 48 - 36) / 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
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
  trophyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
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
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  badge: {
    width: BADGE_SIZE,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.md,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 5,
  },
  badgeSelected: {
    transform: [{ scale: 1.05 }],
  },
  ribbonTop: {
    width: '100%',
    height: 40,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeBody: {
    backgroundColor: colors.cardBg,
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ribbonTails: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  ribbonTail: {
    width: '45%',
    height: 12,
  },
  ribbonTailLeft: {
    borderBottomLeftRadius: 6,
    transform: [{ skewY: '-10deg' }],
  },
  ribbonTailRight: {
    borderBottomRightRadius: 6,
    transform: [{ skewY: '10deg' }],
  },
  selectionIndicator: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#121212',
    borderRadius: 12,
  },
  demoSection: {
    width: '100%',
    marginBottom: 20,
    position: 'relative',
  },
  demoCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoCardHeader: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  demoCardContent: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restaurantInfo: {
    flex: 1,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  voteButtonContainer: {
    position: 'absolute',
    right: 16,
  },
  voteButton: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    gap: 6,
  },
  voteButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  checkmarkContainer: {
    position: 'absolute',
    right: 16,
    alignItems: 'center',
  },
  checkmarkCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  votedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  celebration: {
    position: 'absolute',
    top: -20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  celebrationEmoji: {
    fontSize: 28,
  },
  premiumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(166, 124, 82, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
  },
  premiumText: {
    fontSize: 13,
    color: colors.textMuted,
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
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
});
