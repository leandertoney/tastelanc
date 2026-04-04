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
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { radius } from '../../constants/spacing';
import { duration, spring, reveal, pulse } from '../../constants/animations';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingEvents'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function OnboardingEventsScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const iconScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const textTranslate = useSharedValue(30);
  const glowOpacity = useSharedValue(0.3);
  const pulseScale = useSharedValue(1);
  const noteFloat = useSharedValue(0);

  useEffect(() => {
    iconScale.value = withDelay(reveal.content, withSpring(1, spring.default));
    textOpacity.value = withDelay(reveal.items, withTiming(1, { duration: duration.normal }));
    textTranslate.value = withDelay(reveal.items, withSpring(0, spring.default));
    glowOpacity.value = withRepeat(withSequence(withTiming(0.6, { duration: pulse.duration / 2 }), withTiming(0.3, { duration: pulse.duration / 2 })), -1, true);
    pulseScale.value = withRepeat(withSequence(withTiming(1.08, { duration: 1200, easing: Easing.sin }), withTiming(1, { duration: 1200, easing: Easing.sin })), -1, true);
    noteFloat.value = withRepeat(withSequence(withTiming(-15, { duration: 1800, easing: Easing.sin }), withTiming(15, { duration: 1800, easing: Easing.sin })), -1, true);
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: iconScale.value }] }));
  const glowAnimatedStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value, transform: [{ scale: interpolate(glowOpacity.value, [0.3, 0.6], [1, 1.15]) }] }));
  const pulseAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
  const noteAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: noteFloat.value }] }));
  const textAnimatedStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value, transform: [{ translateY: textTranslate.value }] }));

  return (
    <TouchableOpacity style={styles.container} activeOpacity={1} onPress={() => navigation.navigate('OnboardingSpecials')}>
      <SafeAreaView style={styles.safeArea}>
        <OnboardingProgressBar totalSteps={12} currentStep={3} style={{ paddingHorizontal: 20, paddingTop: 12 }} />
        <View style={styles.content}>
          <View style={styles.iconSection}>
            <Animated.View style={[styles.glowCircle, glowAnimatedStyle]} />
            <Animated.View style={[styles.iconContainer, iconAnimatedStyle, pulseAnimatedStyle]}>
              <Ionicons name="calendar" size={80} color={colors.accent} />
            </Animated.View>
            <Animated.View style={[styles.floatingElement, styles.floatTopLeft, noteAnimatedStyle]}>
              <Ionicons name="musical-notes" size={28} color={colors.accent} />
            </Animated.View>
            <Animated.View style={[styles.floatingElement, styles.floatTopRight, noteAnimatedStyle]}>
              <Ionicons name="mic" size={24} color={colors.accent} />
            </Animated.View>
            <Animated.View style={[styles.floatingElement, styles.floatBottom, noteAnimatedStyle]}>
              <Ionicons name="people" size={26} color={colors.accent} />
            </Animated.View>
          </View>
          <Animated.View style={[styles.textContent, textAnimatedStyle]}>
            <Text style={styles.headline}>Never Miss a Beat</Text>
            <Text style={styles.subheadline}>{`Live music, trivia, comedy nights\nand more—all in one place.`}</Text>
          </Animated.View>
        </View>
        <View style={styles.footer}>
          <View style={styles.pagination}>
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
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
  floatingElement: { position: 'absolute' as const, backgroundColor: colors.cardBg, borderRadius: radius.full, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  floatTopLeft: { left: 10, top: '15%' },
  floatTopRight: { right: 10, top: '20%' },
  floatBottom: { left: '50%', marginLeft: -23, bottom: '12%' },
  textContent: { alignItems: 'center' as const },
  headline: { fontSize: 32, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const, marginBottom: 16 },
  subheadline: { fontSize: 17, color: colors.textMuted, textAlign: 'center' as const, lineHeight: 26 },
  footer: { paddingHorizontal: 32, paddingBottom: 40, alignItems: 'center' as const },
  pagination: { flexDirection: 'row' as const, gap: 8, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textSecondary },
  dotActive: { width: 24, backgroundColor: colors.accent },
  tapHint: { fontSize: 14, color: colors.textSecondary },
}));
