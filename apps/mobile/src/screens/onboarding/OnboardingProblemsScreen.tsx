import { useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
import { duration, spring, reveal } from '../../constants/animations';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingProblems'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = SCREEN_HEIGHT * 0.35;

const heroImage = require('../../../assets/images/onboarding/soundfamiliar.png');

const PAIN_POINTS = [
  'Happy hours scattered across apps.',
  'Events you hear about too late.',
  'Deals buried in your feed.',
];

const STAGGER = 500;

function AnimatedPainPoint({ text, delay }: { text: string; delay: number }) {
  const textOpacity = useSharedValue(0);
  const translateX = useSharedValue(-20);
  const barHeight = useSharedValue(0);

  useEffect(() => {
    barHeight.value = withDelay(delay, withSpring(28, { damping: 14, stiffness: 120 }));
    textOpacity.value = withDelay(delay + 150, withTiming(1, { duration: duration.normal, easing: Easing.out(Easing.cubic) }));
    translateX.value = withDelay(delay + 150, withSpring(0, spring.gentle));
  }, [delay]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    height: barHeight.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.painPoint}>
      <Animated.View style={[styles.accentBar, barAnimatedStyle]} />
      <Animated.View style={[styles.painPointTextWrapper, textAnimatedStyle]}>
        <Text style={styles.painPointText}>{text}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingProblemsScreen({ navigation }: Props) {
  const imageOpacity = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const headerTranslate = useSharedValue(20);

  const closingOpacity = useSharedValue(0);
  const closingTranslate = useSharedValue(16);
  const dividerWidth = useSharedValue(0);

  const hintOpacity = useSharedValue(0);

  const closingDelay = reveal.items + PAIN_POINTS.length * STAGGER + 400;

  useEffect(() => {
    // Image fades in first
    imageOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });

    // Header after image
    headerOpacity.value = withDelay(300, withTiming(1, { duration: duration.entrance }));
    headerTranslate.value = withDelay(300, withSpring(0, spring.default));

    // Divider
    dividerWidth.value = withDelay(closingDelay, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));

    // Closing text
    closingOpacity.value = withDelay(closingDelay + 300, withTiming(1, { duration: duration.normal }));
    closingTranslate.value = withDelay(closingDelay + 300, withSpring(0, spring.gentle));

    // Tap hint
    hintOpacity.value = withDelay(closingDelay + 800, withTiming(1, { duration: duration.normal }));
  }, []);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslate.value }],
  }));

  const dividerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: dividerWidth.value }],
  }));

  const closingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: closingOpacity.value,
    transform: [{ translateY: closingTranslate.value }],
  }));

  const hintAnimatedStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const handleContinue = () => {
    navigation.navigate('OnboardingSolution');
  };

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={handleContinue}
    >
      {/* Hero image with gradient fade */}
      <Animated.View style={[styles.heroSection, imageAnimatedStyle]}>
        <Image source={heroImage} style={styles.heroImage} resizeMode="cover" />
        <LinearGradient
          colors={['transparent', 'rgba(18,18,18,0.6)', '#121212']}
          locations={[0, 0.5, 1]}
          style={styles.heroGradient}
        />
      </Animated.View>

      {/* Content below hero */}
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.content}>
          <Animated.View style={headerAnimatedStyle}>
            <Text style={styles.headline}>Sound familiar?</Text>
          </Animated.View>

          <View style={styles.painPointsList}>
            {PAIN_POINTS.map((point, index) => (
              <AnimatedPainPoint
                key={point}
                text={point}
                delay={reveal.items + index * STAGGER}
              />
            ))}
          </View>

          <View style={styles.closingSection}>
            <Animated.View style={[styles.divider, dividerAnimatedStyle]} />
            <Animated.View style={closingAnimatedStyle}>
              <Text style={styles.closingText}>There's a better way.</Text>
            </Animated.View>
          </View>
        </View>

        <Animated.View style={[styles.footer, hintAnimatedStyle]}>
          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        </Animated.View>
      </SafeAreaView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  heroSection: {
    height: HERO_HEIGHT,
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '130%',
    top: '-10%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 32,
  },
  painPointsList: {
    gap: 24,
  },
  painPoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accentBar: {
    width: 3,
    height: 0,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginRight: 16,
  },
  painPointTextWrapper: {
    flex: 1,
  },
  painPointText: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.textMuted,
    lineHeight: 28,
  },
  closingSection: {
    marginTop: 36,
  },
  divider: {
    height: 1,
    backgroundColor: colors.accent,
    marginBottom: 20,
    transformOrigin: 'left',
  },
  closingText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.accent,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  tapHint: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
