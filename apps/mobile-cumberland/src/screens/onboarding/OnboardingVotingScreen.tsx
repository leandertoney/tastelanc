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
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors, radius } from '../../constants/colors';
import { duration, spring, reveal } from '../../constants/animations';
import { BRAND } from '../../config/brand';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingVoting'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VOTING_CATEGORIES = [
  { id: 'best_wings', label: 'Wings', emoji: '🍗', color: '#FF6B35' },
  { id: 'best_burgers', label: 'Burgers', emoji: '🍔', color: '#E63946' },
  { id: 'best_pizza', label: 'Pizza', emoji: '🍕', color: '#F4A261' },
  { id: 'best_cocktails', label: 'Cocktails', emoji: '🍸', color: '#9B5DE5' },
  { id: 'best_happy_hour', label: 'Happy Hour', emoji: '🍻', color: '#FFD700' },
  { id: 'best_brunch', label: 'Brunch', emoji: '🥞', color: '#F8961E' },
  { id: 'best_late_night', label: 'Late Night', emoji: '🌙', color: '#577590' },
  { id: 'best_live_music', label: 'Live Music', emoji: '🎵', color: '#43AA8B' },
];

export default function OnboardingVotingScreen({ navigation }: Props) {
  const [showVoteDemo, setShowVoteDemo] = useState(false);
  const [showWinner, setShowWinner] = useState(false);

  // Header
  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(-20);

  // Badge grid
  const gridOpacity = useSharedValue(0);

  // Demo card
  const demoOpacity = useSharedValue(0);
  const demoTranslate = useSharedValue(30);

  // Vote checkmark
  const checkScale = useSharedValue(0);

  // Winner badge
  const winnerScale = useSharedValue(0);

  // Button
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(20);

  useEffect(() => {
    // Header
    headerOpacity.value = withTiming(1, { duration: duration.entrance });
    headerTranslate.value = withSpring(0, spring.default);

    // Badge grid
    gridOpacity.value = withDelay(reveal.content, withTiming(1, { duration: duration.normal }));

    // Demo card slides in
    setTimeout(() => {
      setShowVoteDemo(true);
      demoOpacity.value = withTiming(1, { duration: duration.normal });
      demoTranslate.value = withSpring(0, spring.default);
    }, 1200);

    // Vote cast animation
    setTimeout(() => {
      checkScale.value = withSpring(1, { damping: 8, stiffness: 150 });
    }, 2200);

    // Winner badge
    setTimeout(() => {
      setShowWinner(true);
      winnerScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    }, 3000);

    // Continue button
    setTimeout(() => {
      buttonOpacity.value = withTiming(1, { duration: duration.normal });
      buttonTranslate.value = withSpring(0, spring.default);
    }, 3500);
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  const gridAnimatedStyle = useAnimatedStyle(() => ({
    opacity: gridOpacity.value,
  }));

  const demoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: demoOpacity.value,
    transform: [{ translateY: demoTranslate.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const winnerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: winnerScale.value }],
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
          <View style={styles.trophyIcon}>
            <Ionicons name="trophy" size={32} color="#FFD700" />
          </View>
          <Text style={styles.headline}>{`Vote for ${BRAND.cityPossessive} Best`}</Text>
          <Text style={styles.subheadline}>
            8 categories. Monthly winners.{'\n'}Your vote matters.
          </Text>
        </Animated.View>

        {/* Compact Badge Grid */}
        <Animated.View style={[styles.badgeGrid, gridAnimatedStyle]}>
          {VOTING_CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.badge}>
              <Text style={styles.badgeEmoji}>{cat.emoji}</Text>
              <Text style={styles.badgeLabel}>{cat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Demo: Vote → Winner */}
        {showVoteDemo && (
          <Animated.View style={[styles.demoCard, demoAnimatedStyle]}>
            <View style={styles.demoRow}>
              <View style={styles.demoInfo}>
                <Text style={styles.demoCategoryText}>🍗 Best Wings</Text>
                <Text style={styles.demoRestaurantName}>American Bar & Grill</Text>
              </View>

              {!showWinner ? (
                <Animated.View style={[styles.checkCircle, checkAnimatedStyle]}>
                  <Ionicons name="checkmark" size={24} color={'#FFFFFF'} />
                </Animated.View>
              ) : (
                <Animated.View style={[styles.winnerBadge, winnerAnimatedStyle]}>
                  <Ionicons name="trophy" size={14} color={'#FFFFFF'} />
                  <Text style={styles.winnerText}>TOP PICK</Text>
                </Animated.View>
              )}
            </View>
            {showWinner && (
              <Text style={styles.winnerCaption}>
                Winners get badges on their listing
              </Text>
            )}
          </Animated.View>
        )}

        {/* Info note */}
        <View style={styles.infoRow}>
          <Ionicons name="star" size={16} color={colors.accent} />
          <Text style={styles.infoText}>4 votes per month • Included free</Text>
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

const BADGE_SIZE = (SCREEN_WIDTH - 48 - 36) / 4;

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
  trophyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.25)',
  },
  headline: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subheadline: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  badge: {
    width: BADGE_SIZE,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: 'center',
  },
  badgeEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  demoCard: {
    width: '100%',
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  demoInfo: {
    flex: 1,
  },
  demoCategoryText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  demoRestaurantName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  checkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFD700',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  winnerText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  winnerCaption: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(166, 124, 82, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
  },
  infoText: {
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
    color: colors.textOnAccent,
    fontSize: 17,
    fontWeight: '600',
  },
});
