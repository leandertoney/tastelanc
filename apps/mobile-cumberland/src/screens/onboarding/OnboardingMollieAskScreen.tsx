import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { colors, radius } from '../../constants/colors';
import { BRAND } from '../../config/brand';

const mollieAnimated = require('../../../assets/animations/mollie_animated.mp4');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingMollieAsk'>;

const QUESTIONS = [
  { text: "What's good tonight?", position: { top: 40, left: 20 } },
  { text: "Where's the best brunch?", position: { top: 110, right: 20 } },
  { text: "Any live music this weekend?", position: { top: 190, left: 30 } },
  { text: "Who has happy hour right now?", position: { top: 270, right: 25 } },
];

function QuestionBubble({
  text,
  delay,
  position
}: {
  text: string;
  delay: number;
  position: { top?: number; left?: number; right?: number };
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 100 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 100 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.questionBubble, position, animatedStyle]}>
      <Text style={styles.questionText}>{text}</Text>
    </Animated.View>
  );
}

export default function OnboardingMollieAskScreen({ navigation }: Props) {
  const molliePlayer = useVideoPlayer(mollieAnimated, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const mollieOpacity = useSharedValue(0);
  const mollieScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    // Mollie avatar entrance
    mollieOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    mollieScale.value = withSpring(1, { damping: 12, stiffness: 80 });

    // Title entrance
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    titleTranslate.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));

    // Button entrance
    buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));
    buttonTranslate.value = withDelay(1200, withSpring(0, { damping: 16, stiffness: 100 }));

    // Tagline entrance
    taglineOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
  }, []);

  const mollieAnimatedStyle = useAnimatedStyle(() => ({
    opacity: mollieOpacity.value,
    transform: [{ scale: mollieScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingVoting');
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
        {/* Mollie Avatar */}
        <Animated.View style={[styles.mollieContainer, mollieAnimatedStyle]}>
          <View style={styles.mollieAvatar}>
            <VideoView
              player={molliePlayer}
              style={styles.mollieVideo}
              contentFit="cover"
              nativeControls={false}
            />
          </View>
        </Animated.View>

        {/* Headline */}
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>
            Ask <Text style={styles.mollieText}>{BRAND.aiName}</Text> anything
          </Text>
        </Animated.View>

        <View style={styles.questionsContainer}>
          {QUESTIONS.map((question, index) => (
            <QuestionBubble
              key={question.text}
              text={question.text}
              delay={300 + index * 200}
              position={question.position}
            />
          ))}

          {/* Tagline */}
          <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
            <Text style={styles.tagline}>{`She knows ${BRAND.cityName} inside and out.`}</Text>
          </Animated.View>
        </View>
      </View>

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
  },
  mollieContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  mollieAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.accent,
    overflow: 'hidden',
  },
  mollieVideo: {
    width: '100%',
    height: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  mollieText: {
    color: colors.accent,
    fontWeight: '800',
  },
  questionsContainer: {
    flex: 1,
    position: 'relative',
  },
  questionBubble: {
    position: 'absolute',
    backgroundColor: 'rgba(15,30,46,0.06)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(15,30,46,0.15)',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  continueButton: {
    backgroundColor: colors.accent,
    borderRadius: 28,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  taglineContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 16,
  },
  tagline: {
    fontSize: 15,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});
