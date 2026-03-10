import { useEffect } from 'react';
import {
  View,
  Text,
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
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { ContinueButton } from '../../components/Onboarding';
import { getColors, getBrand, getAssets } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { duration, spring, reveal } from '../../constants/animations';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSolution'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingSolutionScreen({ navigation }: Props) {
  const styles = useStyles();
  const brand = getBrand();
  const assets = getAssets();

  const videoSource = assets.splashVideo ?? 0;
  const player = useVideoPlayer(videoSource, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(20);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(20);

  useEffect(() => {
    // Logo entrance
    logoOpacity.value = withDelay(reveal.header, withTiming(1, { duration: duration.entrance }));
    logoScale.value = withDelay(reveal.header, withSpring(1, spring.gentle));

    // Text entrance
    textOpacity.value = withDelay(reveal.items, withTiming(1, { duration: duration.normal }));
    textTranslate.value = withDelay(reveal.items, withSpring(0, spring.default));

    // Button
    buttonOpacity.value = withDelay(reveal.button, withTiming(1, { duration: duration.normal }));
    buttonTranslate.value = withDelay(reveal.button, withSpring(0, spring.default));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslate.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingHappyHours');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* App logo */}
          <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
            <VideoView
              player={player}
              style={styles.logo}
              contentFit="contain"
              nativeControls={false}
            />
          </Animated.View>

          {/* Text */}
          <Animated.View style={[styles.textContent, textAnimatedStyle]}>
            <Text style={styles.headline}>{`${brand.appName} can help.`}</Text>
            <Text style={styles.subheadline}>
              {`Happy hours, events, and the best spots\n— all in one place.`}
            </Text>
          </Animated.View>
        </View>

        {/* Continue button */}
        <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
          <ContinueButton onPress={handleContinue} label="See how it works" />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center' as const,
  },
  logo: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    backgroundColor: 'transparent',
  },
  textContent: {
    alignItems: 'center' as const,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  subheadline: {
    fontSize: 17,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
}));
