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
  Easing,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { useNavigationActions } from '../../context/NavigationActionsContext';
import { getColors, getAssets } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingPremiumIntro'>;

export default function OnboardingPremiumIntroScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const assets = getAssets();
  const { data, completeOnboarding } = useOnboarding();
  const { finishOnboarding } = useNavigationActions();
  const userName = data.name;

  const videoSource = assets.splashVideo ?? 0;
  const player = useVideoPlayer(videoSource, player => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    titleTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    buttonOpacity.value = withDelay(300, withTiming(1, { duration: 400 }));
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value }));

  const handleContinue = async () => {
    await completeOnboarding();
    navigation.navigate('OnboardingThemePicker');
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.content}>
        <Animated.View style={[styles.videoContainer, titleAnimatedStyle]}>
          <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
        </Animated.View>
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>{`You're all set${userName ? `, ${userName}` : ''}!`}</Text>
          <Text style={styles.subheadline}>Let's find something good.</Text>
        </Animated.View>
      </View>
      <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueText}>Let's Go</Text>
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
  videoContainer: { width: 160, height: 160, alignItems: 'center' as const, justifyContent: 'center' as const, marginBottom: 32 },
  video: { width: '100%', height: '100%' },
  headerSection: { alignItems: 'center' as const },
  headline: { fontSize: 32, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const, marginBottom: 12 },
  subheadline: { fontSize: 17, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 24 },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  continueButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: 18, gap: 8 },
  continueText: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
}));
