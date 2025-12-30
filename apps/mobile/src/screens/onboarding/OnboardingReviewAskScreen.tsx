import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  withSpring,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { setUserSentiment } from '../../lib/reviewPrompts';
import { colors, radius } from '../../constants/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingReviewAsk'>;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function OnboardingReviewAskScreen({ navigation }: Props) {
  const [selectedOption, setSelectedOption] = useState<'positive' | 'neutral' | null>(null);

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const card1Scale = useSharedValue(0.8);
  const card1Opacity = useSharedValue(0);
  const card2Scale = useSharedValue(0.8);
  const card2Opacity = useSharedValue(0);
  const skipOpacity = useSharedValue(0);

  useEffect(() => {
    // Animate title
    titleOpacity.value = withTiming(1, { duration: 400 });
    titleTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });

    // Animate cards with stagger
    card1Opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    card1Scale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 100 }));

    card2Opacity.value = withDelay(350, withTiming(1, { duration: 400 }));
    card2Scale.value = withDelay(350, withSpring(1, { damping: 15, stiffness: 100 }));

    // Skip link
    skipOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const card1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: card1Opacity.value,
    transform: [{ scale: card1Scale.value }],
  }));

  const card2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: card2Opacity.value,
    transform: [{ scale: card2Scale.value }],
  }));

  const skipAnimatedStyle = useAnimatedStyle(() => ({
    opacity: skipOpacity.value,
  }));

  const handleSelect = async (sentiment: 'positive' | 'neutral') => {
    setSelectedOption(sentiment);
    await setUserSentiment(sentiment);

    // Auto-advance after brief delay for visual feedback
    setTimeout(() => {
      navigation.navigate('OnboardingPremiumIntro');
    }, 400);
  };

  const handleSkip = () => {
    // Skip without setting sentiment (neutral by default, but won't trigger prompts)
    navigation.navigate('OnboardingPremiumIntro');
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
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>Loving what you see?</Text>
          <Text style={styles.subheadline}>Your feedback helps us grow</Text>
        </Animated.View>

        <View style={styles.cardsContainer}>
          <AnimatedTouchable
            style={[
              styles.card,
              card1AnimatedStyle,
              selectedOption === 'positive' && styles.cardSelected,
            ]}
            onPress={() => handleSelect('positive')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, selectedOption === 'positive' && styles.iconCircleSelected]}>
              <Text style={styles.emoji}>❤️</Text>
            </View>
            <Text style={styles.cardTitle}>Yes, I'm excited!</Text>
            <Text style={styles.cardDescription}>
              Can't wait to explore Lancaster
            </Text>
            {selectedOption === 'positive' && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={20} color={colors.text} />
              </View>
            )}
          </AnimatedTouchable>

          <AnimatedTouchable
            style={[
              styles.card,
              card2AnimatedStyle,
              selectedOption === 'neutral' && styles.cardSelected,
            ]}
            onPress={() => handleSelect('neutral')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconCircle, selectedOption === 'neutral' && styles.iconCircleSelected]}>
              <Text style={styles.emoji}>🤔</Text>
            </View>
            <Text style={styles.cardTitle}>Not sure yet</Text>
            <Text style={styles.cardDescription}>
              I'll explore first
            </Text>
            {selectedOption === 'neutral' && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark" size={20} color={colors.text} />
              </View>
            )}
          </AnimatedTouchable>
        </View>

        <Animated.View style={[styles.skipContainer, skipAnimatedStyle]}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

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
  },
  headerSection: {
    marginBottom: 48,
    alignItems: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.cardBgSelected,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleSelected: {
    backgroundColor: colors.accent,
  },
  emoji: {
    fontSize: 36,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipContainer: {
    marginTop: 'auto',
    paddingBottom: 32,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 15,
    color: colors.textMuted,
    padding: 12,
  },
});
