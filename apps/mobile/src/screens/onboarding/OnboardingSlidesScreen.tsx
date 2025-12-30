import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ContinueButton } from '../../components/Onboarding';
import { colors } from '../../constants/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSlides'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const videoSource = require('../../../assets/animation/tastelanc_dark_spin.mp4');

// Story words that fly in one at a time - the tagline
const STORY_LINES = [
  { text: 'Eat.', style: 'hero' as const },
  { text: 'Drink.', style: 'accent' as const },
  { text: 'Experience!', style: 'bold' as const },
];

// Individual animated word component
function AnimatedWord({
  text,
  style,
  delay
}: {
  text: string;
  style: 'hero' | 'accent' | 'bold';
  delay: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 100 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 15, stiffness: 100 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const getTextStyle = () => {
    switch (style) {
      case 'hero':
        return styles.wordHero;
      case 'accent':
        return styles.wordAccent;
      case 'bold':
        return styles.wordBold;
    }
  };

  return (
    <Animated.View style={[styles.wordContainer, animatedStyle]}>
      <Text style={[styles.wordBase, getTextStyle()]}>{text}</Text>
    </Animated.View>
  );
}

export default function OnboardingSlidesScreen({ navigation }: Props) {
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Animation values
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const contentOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslate = useSharedValue(20);

  useEffect(() => {
    // Logo entrance - immediate and dramatic
    logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 80 });

    // Content fades in
    contentOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));

    // Subtitle after story completes (3 words × 400ms stagger = 1200ms + 600ms base)
    const subtitleDelay = 1800;
    subtitleOpacity.value = withDelay(subtitleDelay, withTiming(1, { duration: 500 }));
    subtitleTranslate.value = withDelay(subtitleDelay, withSpring(0, { damping: 18, stiffness: 100 }));

    // Button after everything settles
    const buttonDelay = 2200;
    buttonOpacity.value = withDelay(buttonDelay, withTiming(1, { duration: 400 }));
    buttonTranslate.value = withDelay(buttonDelay, withSpring(0, { damping: 16, stiffness: 100 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslate.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingHappyHours');
  };

  // Calculate word delays for dramatic reveal
  const wordBaseDelay = 600;
  const wordStagger = 400;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.content}>
          {/* Animated Logo */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <VideoView
              player={player}
              style={styles.logo}
              contentFit="contain"
              nativeControls={false}
            />
          </Animated.View>

          {/* Main Story Typography */}
          <Animated.View style={[styles.storyContainer, contentAnimatedStyle]}>
            {/* Animated Words */}
            <View style={styles.wordsWrapper}>
              {STORY_LINES.map((line, index) => (
                <AnimatedWord
                  key={line.text}
                  text={line.text}
                  style={line.style}
                  delay={wordBaseDelay + (index * wordStagger)}
                />
              ))}
            </View>

            {/* Subtitle */}
            <Animated.View style={subtitleAnimatedStyle}>
              <Text style={styles.subtitle}>
                Lancaster's go-to for what's happening now.
              </Text>
            </Animated.View>
          </Animated.View>

          {/* Continue Button */}
          <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
            <ContinueButton onPress={handleContinue} label="Get Started" />
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: SCREEN_HEIGHT * 0.28,
    marginTop: 10,
    backgroundColor: 'transparent',
  },
  logo: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_HEIGHT * 0.25,
    backgroundColor: 'transparent',
  },

  // Story typography
  storyContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  wordsWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  wordContainer: {
    marginVertical: 2,
  },
  wordBase: {
    textAlign: 'center',
    color: colors.text,
  },
  wordHero: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#FFFFFF',
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  wordAccent: {
    fontSize: 48,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -1,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  wordBold: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
    textTransform: 'uppercase',
    color: '#FFFFFF',
    textShadowColor: colors.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
  },

  // Button
  buttonContainer: {
    marginTop: 'auto',
    paddingTop: 20,
  },
});
