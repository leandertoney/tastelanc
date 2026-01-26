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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../constants/colors';
import { supabase } from '../lib/supabase';

export const EMAIL_GATE_STORAGE_KEY = '@tastelanc_email_gate_provided';

interface EmailGateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ModalState = 'input' | 'loading' | 'success' | 'error';

export default function EmailGateModal({
  visible,
  onClose,
  onSuccess,
}: EmailGateModalProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<ModalState>('input');
  const [errorMessage, setErrorMessage] = useState('');

  const emailRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setEmail('');
      setState('input');
      setErrorMessage('');

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      setTimeout(() => {
        emailRef.current?.focus();
      }, 300);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      return;
    }

    if (!validateEmail(email.trim())) {
      setErrorMessage('Please enter a valid email');
      return;
    }

    setState('loading');
    setErrorMessage('');

    try {
      // Save locally first for immediate gate lift
      await AsyncStorage.setItem(EMAIL_GATE_STORAGE_KEY, email.trim());

      // Attach email to the anonymous Supabase user
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (error) {
        // Log but don't block — the gate is about email collection, not account integrity
        console.log('[EmailGate] updateUser error (non-blocking):', error.message);
      }

      setState('success');

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('[EmailGate] Error:', err);
      // If we saved to AsyncStorage, still let them through
      const saved = await AsyncStorage.getItem(EMAIL_GATE_STORAGE_KEY);
      if (saved) {
        setState('success');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      } else {
        setErrorMessage('Something went wrong. Please try again.');
        setState('error');
      }
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
            <Text style={styles.stateTitle}>One moment...</Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, styles.successCircle]}>
              <Ionicons name="checkmark" size={48} color={colors.success} />
            </View>
            <Text style={styles.stateTitle}>You're in!</Text>
            <Text style={styles.stateMessage}>Enjoy exploring Lancaster's best</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, styles.errorCircle]}>
              <Ionicons name="alert-circle" size={48} color={colors.error} />
            </View>
            <Text style={styles.stateTitle}>Something Went Wrong</Text>
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
                <Ionicons name="mail-outline" size={32} color={colors.accent} />
              </View>
              <Text style={styles.title}>Stay in the Loop</Text>
              <Text style={styles.subtitle}>
                Drop your email to unlock all of Lancaster's best food & events
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
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {errorMessage && state === 'input' && (
                <Text style={styles.errorText}>{errorMessage}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleSubmit}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
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
  errorText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: colors.accent,
    width: '100%',
    paddingVertical: 14,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  continueButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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
});
