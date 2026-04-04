import { useEffect } from 'react';
import {
  View,
  Text,
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
  withRepeat,
  withSequence,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { radius } from '../../constants/spacing';
import { duration, spring, reveal, pulse } from '../../constants/animations';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingSpecials'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingSpecialsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const iconScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(30);
  const glowOpacity = useSharedValue(0.3);
  const sparkleRotate = useSharedValue(0);
  const tagBounce = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(reveal.content, withSpring(1, spring.default));
    textOpacity.value = withDelay(reveal.items, withTiming(1, { duration: duration.normal }));
    textTranslate.value = withDelay(reveal.items, withSpring(0, spring.default));
    glowOpacity.value = withRepeat(withSequence(withTiming(0.6, { duration: pulse.duration / 2 }), withTiming(0.3, { duration: pulse.duration / 2 })), -1, true);
    sparkleRotate.value = withRepeat(withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false);
    tagBounce.value = withRepeat(withSequence(withTiming(-6, { duration: 800, easing: Easing.sin }), withTiming(6, { duration: 800, easing: Easing.sin })), -1, true);
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
  const glowAnimatedStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value, transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.6], [1, 1.15]) }] }));
  const sparkleAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sparkleRotate.value}deg` }] }));
  const tagAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: tagBounce.value }] }));
  const textAnimatedStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value, transform: [{ translateY: textTranslate.value }] }));

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => navigation.navigate('OnboardingUserType')}>
      <SafeAreaView style={styles.safeArea}>
        <OnboardingProgressBar totalSteps={12} currentStep={4} style={{ paddingHorizontal: 20, paddingTop: 12 }} />
        <View style={styles.content}>
          <View style={styles.iconSection}>
            <Animated.View style={[styles.glowCircle, glowAnimatedStyle]} />
            <Animated.View style={[styles.iconContainer, iconAnimatedStyle]}>
              <Ionicons name="pricetag" size={80} color={colors.accent} />
            </Animated.View>
            <Animated.View style={[styles.sparkleOrbit, sparkleAnimatedStyle]}>
              <View style={[styles.sparkle, styles.sparkle1]}><Ionicons name="sparkles" size={20} color={colors.accent} /></View>
              <View style={[styles.sparkle, styles.sparkle2]}><Ionicons name="star" size={18} color={colors.accent} /></View>
              <View style={[styles.sparkle, styles.sparkle3]}><Ionicons name="sparkles" size={16} color={colors.accent} /></View>
            </Animated.View>
            <Animated.View style={[styles.floatingTag, styles.tagLeft, tagAnimatedStyle]}><Text style={styles.tagText}>2 for 1</Text></Animated.View>
            <Animated.View style={[styles.floatingTag, styles.tagRight, tagAnimatedStyle]}><Text style={styles.tagText}>$5 Apps</Text></Animated.View>
          </View>
          <Animated.View style={[styles.textContent, textAnimatedStyle]}>
            <Text style={styles.headline}>Daily Deals, Weekly Picks</Text>
            <Text style={styles.subheadline}>{`Special deals picked\njust for ${brand.cityName}.`}</Text>
          </Animated.View>
        </View>
        <View style={styles.footer}>
          <View style={styles.pagination}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
          </View>
          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        </View>
      </SafeAreaView>
    </TouchableOpacity>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center' as const, alignItems: 'center' as const, paddingHorizontal: 32 },
  iconSection: { width: SCREEN_WIDTH * 0.7, height: SCREEN_WIDTH * 0.7, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 48 },
  glowCircle: { position: 'absolute' as const, width: 200, height: 200, borderRadius: 100, backgroundColor: colors.accent },
  iconContainer: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.cardBg, justifyContent: 'center' as const, alignItems: 'center' as const, shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
  sparkleOrbit: { position: 'absolute' as const, width: 240, height: 240 },
  sparkle: { position: 'absolute' as const, backgroundColor: colors.cardBg, borderRadius: radius.full, padding: 8 },
  sparkle1: { top: 0, left: '50%', marginLeft: -16 },
  sparkle2: { bottom: 20, left: 20 },
  sparkle3: { bottom: 20, right: 20 },
  floatingTag: { position: 'absolute' as const, backgroundColor: colors.valueGreen, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  tagLeft: { left: -10, top: '40%' },
  tagRight: { right: -10, bottom: '35%' },
  tagText: { color: colors.text, fontSize: 13, fontWeight: '700' as const },
  textContent: { alignItems: 'center' as const },
  headline: { fontSize: 32, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const, marginBottom: 16 },
  subheadline: { fontSize: 17, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 26 },
  footer: { paddingHorizontal: 32, paddingBottom: 40, alignItems: 'center' as const },
  pagination: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textSecondary },
  dotActive: { width: 24, backgroundColor: colors.accent },
  tapHint: { fontSize: 14, color: colors.textSecondary },
}));
