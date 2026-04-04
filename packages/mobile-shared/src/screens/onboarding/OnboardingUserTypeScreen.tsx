import { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  withSpring,
} from 'react-native-reanimated';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '../../navigation/types';
import { useOnboarding } from '../../context/OnboardingContext';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';
import type { UserType } from '../../types/onboarding';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingUserType'>;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function OnboardingUserTypeScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const { setUserType } = useOnboarding();

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const card1Scale = useSharedValue(0.8);
  const card1Opacity = useSharedValue(0);
  const card2Scale = useSharedValue(0.8);
  const card2Opacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    titleTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    card1Opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    card1Scale.value = withDelay(200, withSpring(1, { damping: 15, stiffness: 100 }));
    card2Opacity.value = withDelay(350, withTiming(1, { duration: 400 }));
    card2Scale.value = withDelay(350, withSpring(1, { damping: 15, stiffness: 100 }));
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const card1AnimatedStyle = useAnimatedStyle(() => ({ opacity: card1Opacity.value, transform: [{ scale: card1Scale.value }] }));
  const card2AnimatedStyle = useAnimatedStyle(() => ({ opacity: card2Opacity.value, transform: [{ scale: card2Scale.value }] }));

  const handleSelect = (type: UserType) => {
    setUserType(type);
    setTimeout(() => { navigation.navigate('OnboardingName'); }, 300);
  };

  return (
    <SafeAreaView style={styles.container}>
      <OnboardingProgressBar totalSteps={12} currentStep={5} style={{ paddingHorizontal: 20, paddingTop: 12 }} />
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.content}>
        <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
          <Text style={styles.headline}>First things first...</Text>
          <Text style={styles.subheadline}>Help us personalize your experience</Text>
        </Animated.View>
        <View style={styles.cardsContainer}>
          <AnimatedTouchable style={[styles.card, card1AnimatedStyle]} onPress={() => handleSelect('local')} activeOpacity={0.8}>
            <View style={styles.iconCircle}><Ionicons name="home" size={40} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>I'm a Local 🏡</Text>
            <Text style={styles.cardDescription}>{`I live in or near ${brand.cityName}`}</Text>
          </AnimatedTouchable>
          <AnimatedTouchable style={[styles.card, card2AnimatedStyle]} onPress={() => handleSelect('visitor')} activeOpacity={0.8}>
            <View style={styles.iconCircle}><Ionicons name="airplane" size={40} color={colors.accent} /></View>
            <Text style={styles.cardTitle}>I'm Visiting ✈️</Text>
            <Text style={styles.cardDescription}>{`Exploring ${brand.cityName} for a trip`}</Text>
          </AnimatedTouchable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.primary },
  backButton: { padding: 16 },
  content: { flex: 1, paddingHorizontal: 24 },
  headerSection: { marginBottom: 32 },
  headline: { fontSize: 28, fontWeight: '700' as const, color: colors.text, marginBottom: 8 },
  subheadline: { fontSize: 16, color: colors.textMuted },
  cardsContainer: { gap: 12 },
  card: { backgroundColor: colors.cardBg, borderRadius: radius.lg, padding: 28, alignItems: 'center' as const, borderWidth: 2, borderColor: 'transparent' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.cardBgElevated, justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 16 },
  cardTitle: { fontSize: 20, fontWeight: '700' as const, color: colors.text, marginBottom: 8 },
  cardDescription: { fontSize: 15, color: colors.textMuted, textAlign: 'center' as const },
}));
