import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useOnboarding } from '../../context/OnboardingContext';
import { getColors } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { radius } from '../../constants/spacing';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingName'>;

export default function OnboardingNameScreen({ navigation }: Props) {
  const styles = useStyles();
  const colors = getColors();
  const { data, setName } = useOnboarding();
  const [inputValue, setInputValue] = useState(data.name || '');

  const titleOpacity = useSharedValue(0);
  const titleTranslate = useSharedValue(-20);
  const inputOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonTranslate = useSharedValue(20);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 400 });
    titleTranslate.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) });
    inputOpacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    buttonOpacity.value = withDelay(400, withTiming(1, { duration: 400 }));
    buttonTranslate.value = withDelay(400, withSpring(0, { damping: 16, stiffness: 100 }));
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value, transform: [{ translateY: titleTranslate.value }] }));
  const inputAnimatedStyle = useAnimatedStyle(() => ({ opacity: inputOpacity.value }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ opacity: buttonOpacity.value, transform: [{ translateY: buttonTranslate.value }] }));

  const handleContinue = () => {
    if (inputValue.trim()) { setName(inputValue.trim()); }
    navigation.navigate('OnboardingDiningHabits');
  };
  const handleSkip = () => { navigation.navigate('OnboardingDiningHabits'); };
  const isValid = inputValue.trim().length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.content}>
          <Animated.View style={[styles.headerSection, titleAnimatedStyle]}>
            <Text style={styles.headline}>What should we call you?</Text>
            <Text style={styles.subheadline}>First name is perfect</Text>
          </Animated.View>
          <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
            <TextInput style={styles.input} value={inputValue} onChangeText={setInputValue} placeholder="Your name" placeholderTextColor={colors.textMuted} autoCapitalize="words" autoCorrect={false} autoFocus returnKeyType="done" onSubmitEditing={handleContinue} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.footer, buttonAnimatedStyle]}>
          <TouchableOpacity style={[styles.continueButton, !isValid && styles.continueButtonDisabled]} onPress={handleContinue} disabled={!isValid}>
            <Text style={styles.continueText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: { flex: 1, backgroundColor: '#121212' },
  keyboardView: { flex: 1 },
  backButton: { padding: 16 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' as const },
  headerSection: { alignItems: 'center' as const, marginBottom: 32 },
  headline: { fontSize: 32, fontWeight: '700' as const, color: colors.text, textAlign: 'center' as const, marginBottom: 8 },
  subheadline: { fontSize: 16, color: colors.textMuted, textAlign: 'center' as const },
  inputContainer: { alignItems: 'center' as const },
  input: { width: '100%', maxWidth: 300, fontSize: 24, fontWeight: '600' as const, color: colors.text, textAlign: 'center' as const, paddingVertical: 16, paddingHorizontal: 20, backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)' },
  footer: { paddingHorizontal: 24, paddingBottom: 24 },
  continueButton: { backgroundColor: colors.accent, borderRadius: 28, paddingVertical: 16, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 8 },
  continueButtonDisabled: { opacity: 0.5 },
  continueText: { color: colors.text, fontSize: 16, fontWeight: '600' as const },
  skipButton: { alignItems: 'center' as const, paddingVertical: 16, marginTop: 8 },
  skipText: { color: colors.textMuted, fontSize: 14 },
}));
