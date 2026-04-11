import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
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
import { getColors, getBrand, getAssets } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { trackScreenView } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingRosieAsk'>;

const QUESTIONS = [
  { text: "What's good tonight?", position: { top: 40, left: 20 } },
  { text: "Where's the best brunch?", position: { top: 110, right: 20 } },
  { text: "Any live music this weekend?", position: { top: 190, left: 30 } },
  { text: "Who has happy hour right now?", position: { top: 270, right: 25 } },
];

function QuestionBubble({ text, delay, position }: { text: string; delay: number; position: { top?: number; left?: number; right?: number } }) {
  const styles = useStyles();
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
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.questionBubble, position, animatedStyle]}>
      <Text style={styles.questionText}>{text}</Text>
    </Animated.View>
  );
}

export default function OnboardingRosieAskScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const assets = getAssets();

  const videoSource = assets.aiAnimated;
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const rosieOpacity = useSharedValue(0);
  const rosieScale = useSharedValue(0.8);
  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(20);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    trackScreenView('OnboardingStep_RosieAsk');
  }, []);

  useEffect(() => {
    rosieOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    rosieScale.value = withSpring(1, { damping: 12, stiffness: 80 });
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    titleTranslate.value = withDelay(200, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
    buttonOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));
    buttonTranslate.value = withDelay(1200, withSpring(0, { damping: 16, stiffness: 100 }));
    taglineOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
  }, []);

  const rosieAnimatedStyle = useAnimatedStyle(() => ({ opacity: rosieOpacity.value, transform: [{ scale: rosieScale.value }] }));
  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value, transform: [{ translateY: buttonTranslate.value }] }));
  const taglineAnimatedStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar totalSteps={12} currentStep={8} style={{ paddingHorizontal: 20, paddingTop: 12 }} />
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.content}>
        <Animated.View style={[styles.rosieContainer, rosieAnimatedStyle]}>
          <VideoView player={player} style={styles.rosieAvatar} contentFit="contain" nativeControls={false} />
        </Animated.View>
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>Ask <Text style={styles.rosieText}>{brand.aiName}</Text> anything</Text>
        </Animated.View>
        <View style={styles.questionsContainer}>
          {QUESTIONS.map((question, index) => (
            <QuestionBubble key={question.text} text={question.text} delay={300 + index * 200} position={question.position} />
          ))}
          <Animated.View style={[styles.taglineContainer, taglineAnimatedStyle]}>
            <Text style={styles.tagline}>{`She knows ${brand.cityName} inside and out.`}</Text>
          </Animated.View>
        </View>
      </View>
      <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
        <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('OnboardingReviewAsk')}>
          <Text style={styles.continueText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  backButton: { padding: 16 },
  content: { flex: 1, paddingHorizontal: 24 },
  rosieContainer: { alignItems: 'center' as const, marginTop: 10 },
  rosieAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: colors.accent, overflow: 'hidden' as const },
  headerSection: { alignItems: 'center' as const, marginTop: 16 },
  headline: { fontSize: 32, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const },
  rosieText: { color: colors.accent, fontWeight: '800' as const },
  questionsContainer: { flex: 1, position: 'relative' as const },
  questionBubble: { position: 'absolute' as const, backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  questionText: { fontSize: 16, fontWeight: '500' as const, color: colors.text },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  continueButton: { backgroundColor: colors.accent, borderRadius: 28, paddingVertical: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  continueText: { color: colors.text, fontSize: 16, fontWeight: '600' as const },
  taglineContainer: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, alignItems: 'center' as const, paddingBottom: 16 },
  tagline: { fontSize: 15, color: colors.textMuted, fontStyle: 'italic' as const },
}));
