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
import { trackScreenView } from '../../lib/analytics';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPremium'>;

export default function OnboardingPremiumScreen({ navigation }: Props) {
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

  const videoOpacity = useSharedValue(0);
  const videoScale = useSharedValue(0.8);
  const headlineOpacity = useSharedValue(0);
  const headlineTranslate = useSharedValue(-20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(20);

  useEffect(() => {
    trackScreenView('OnboardingStep_Premium');
  }, []);

  useEffect(() => {
    videoOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) });
    videoScale.value = withSpring(1, { damping: 12, stiffness: 80 });
    headlineOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    headlineTranslate.value = withDelay(200, withSpring(0, { damping: 18, stiffness: 100 }));
    buttonOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    buttonTranslate.value = withDelay(600, withSpring(0, { damping: 16, stiffness: 100 }));
  }, []);

  const videoAnimatedStyle = useAnimatedStyle(() => ({ opacity: videoOpacity.value, transform: [{ scale: videoScale.value }] }));
  const headlineAnimatedStyle = useAnimatedStyle(() => ({ opacity: headlineOpacity.value, transform: [{ translateY: headlineTranslate.value }] }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value, transform: [{ translateY: buttonTranslate.value }] }));

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.content}>
        <Animated.View style={[styles.videoContainer, videoAnimatedStyle]}>
          <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
        </Animated.View>
        <Animated.View style={headlineAnimatedStyle}>
          <Text style={styles.headline}>{`Meet ${brand.aiName}`}</Text>
          <Text style={styles.subheadline}>Your guide to what's good.</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
        <TouchableOpacity style={styles.continueButton} onPress={() => navigation.navigate('OnboardingRosieAsk')}>
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
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' as const, alignItems: 'center' as const },
  videoContainer: { width: 200, height: 200, marginBottom: 24, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 100, borderWidth: 3, borderColor: colors.accent, overflow: 'hidden' as const, shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  video: { width: '100%', height: '100%' },
  headline: { fontSize: 32, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const, marginBottom: 12 },
  subheadline: { fontSize: 17, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  continueButton: { backgroundColor: colors.accent, borderRadius: 28, paddingVertical: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  continueText: { color: colors.text, fontSize: 16, fontWeight: '600' as const },
}));
