import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../constants/colors';
import { supabase } from '../lib/supabase';

interface SignUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action?: string; // e.g., "save this restaurant"
}

type SignUpState = 'input' | 'loading' | 'success' | 'error';
type AuthMode = 'signup' | 'login';

export default function SignUpModal({
  visible,
  onClose,
  onSuccess,
  action = 'save your favorites',
}: SignUpModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<SignUpState>('input');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setEmail('');
      setPassword('');
      setState('input');
      setErrorMessage('');
      setShowPassword(false);
      setMode('signup');

      // Animate in
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Focus email input
      setTimeout(() => {
        emailRef.current?.focus();
      }, 300);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    // Validate inputs
    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      return;
    }

    if (!validateEmail(email.trim())) {
      setErrorMessage('Please enter a valid email');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      if (mode === 'login') {
        // Log in with existing account
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          console.error('Login error:', error.message);
          if (error.message.includes('Invalid login')) {
            setErrorMessage('Invalid email or password');
          } else if (error.message.includes('rate limit')) {
            setErrorMessage('Too many attempts. Please try again later.');
          } else {
            setErrorMessage(error.message);
          }
          setState('error');
          return;
        }

        console.log('Login successful, user:', data.user?.id);
      } else {
        // Sign up - Update the anonymous user with email and password
        // This converts the anonymous account to a permanent one
        const { data, error } = await supabase.auth.updateUser({
          email: email.trim(),
          password: password,
        });

        if (error) {
          console.error('Signup error:', error.message);
          // Handle specific error cases
          if (error.message.includes('already registered') || error.message.includes('already been registered')) {
            setErrorMessage('This email is already registered. Try logging in instead.');
            // Auto-switch to login mode
            setMode('login');
            setState('input');
            return;
          } else if (error.message.includes('invalid')) {
            setErrorMessage('Invalid email or password format');
          } else if (error.message.includes('rate limit')) {
            setErrorMessage('Too many attempts. Please try again later.');
          } else {
            setErrorMessage(error.message);
          }
          setState('error');
          return;
        }

        console.log('Signup successful, user:', data.user?.id, 'is_anonymous:', data.user?.is_anonymous);
      }

      // Refresh the session to ensure auth state is updated
      await supabase.auth.refreshSession();

      setState('success');

      // Auto-close and trigger success callback
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Auth error:', err);
      setErrorMessage('Something went wrong. Please try again.');
      setState('error');
    }
  };

  const handleRetry = () => {
    setState('input');
    setErrorMessage('');
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.stateTitle}>Creating your account...</Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, styles.successCircle]}>
              <Ionicons name="checkmark" size={48} color={colors.success} />
            </View>
            <Text style={styles.stateTitle}>
              {mode === 'login' ? 'Welcome Back!' : 'Account Created!'}
            </Text>
            <Text style={styles.stateMessage}>You can now save your favorites</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, styles.errorCircle]}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
            </View>
            <Text style={styles.stateTitle}>Sign Up Failed</Text>
            <Text style={styles.stateMessage}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <>
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
              <View style={styles.headerIcon}>
                <Ionicons name="heart" size={32} color={colors.accent} />
              </View>
              <Text style={styles.title}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </Text>
              <Text style={styles.subtitle}>
                {mode === 'login' ? 'Log in to ' : 'Sign up to '}{action}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {errorMessage && state === 'input' && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.signUpButtonText}>
                {mode === 'login' ? 'Log In' : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchModeButton}
              onPress={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setErrorMessage('');
              }}
            >
              <Text style={styles.switchModeText}>
                {mode === 'login'
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Log in'}
              </Text>
            </TouchableOpacity>

            {mode === 'signup' && (
              <Text style={styles.termsText}>
                By signing up, you agree to our Terms of Service and Privacy Policy
              </Text>
            )}
          </>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {renderContent()}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: colors.cardBg,
    borderRadius: radius.xl,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  closeIcon: {
    position: 'absolute',
    top: -8,
    right: 0,
    padding: 8,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  signUpButton: {
    backgroundColor: colors.accent,
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  signUpButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
  stateContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successCircle: {
    backgroundColor: `${colors.success}20`,
  },
  errorCircle: {
    backgroundColor: `${colors.error}20`,
  },
  stateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stateMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: radius.full,
    marginTop: 20,
  },
  retryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeButton: {
    marginTop: 16,
    padding: 8,
  },
  switchModeText: {
    color: colors.accent,
    fontSize: 14,
    textAlign: 'center',
  },
});
