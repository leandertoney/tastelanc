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
import { colors } from '../../constants/colors';
import { BRAND } from '../../config/brand';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPremium'>;

const mollieAnimated = require('../../../assets/animations/mollie_animated.mp4');

export default function OnboardingPremiumScreen({ navigation }: Props) {
  const molliePlayer = useVideoPlayer(mollieAnimated, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  // Animation values
  const videoOpacity = useSharedValue(0);
  const videoScale = useSharedValue(0.8);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslate = useSharedValue(-20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(20);

  useEffect(() => {
    // Video entrance
    videoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    videoScale.value = withSpring(1, { damping: 12, stiffness: 80 });

    // Headline entrance
    headlineOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    headlineTranslate.value = withDelay(200, withSpring(0, { damping: 18, stiffness: 100 }));

    // Button entrance
    buttonOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    buttonTranslate.value = withDelay(600, withSpring(0, { damping: 16, stiffness: 100 }));
  }, []);

  const videoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: videoOpacity.value,
    transform: [{ scale: videoScale.value }],
  }));

  const headlineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headlineOpacity.value,
    transform: [{ translateY: headlineTranslate.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingMollieAsk');
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
        <Animated.View style={[styles.videoContainer, videoAnimatedStyle]}>
          <VideoView
            player={molliePlayer}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />
        </Animated.View>

        <Animated.View style={headlineAnimatedStyle}>
          <Text style={styles.headline}>{`Meet ${BRAND.aiName}`}</Text>
          <Text style={styles.subheadline}>
            Your guide to what's good.
          </Text>
        </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: 200,
    height: 200,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.accent,
    overflow: 'hidden',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 17,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
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
});
