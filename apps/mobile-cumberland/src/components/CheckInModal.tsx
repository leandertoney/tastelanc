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
import { recordCheckIn, canCheckIn } from '../lib/checkins';
import { useAuth } from '../hooks/useAuth';
import { useRecordCheckinForSocialProof } from '../hooks/useSocialProof';

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  restaurantPin?: string; // Restaurant's unique PIN (default: 1234 for demo)
}

type CheckInState = 'input' | 'verifying' | 'success' | 'error' | 'already_checked';

export default function CheckInModal({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  restaurantPin = '1234', // Default PIN for demo
}: CheckInModalProps) {
  const { userId } = useAuth();
  const recordCheckinForSocialProof = useRecordCheckinForSocialProof();
  const [pin, setPin] = useState(['', '', '', '']);
  const [state, setState] = useState<CheckInState>('input');
  const [message, setMessage] = useState('');
  const [pointsEarned, setPointsEarned] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setPin(['', '', '', '']);
      setState('input');
      setMessage('');

      // Check if already checked in today
      checkCanCheckIn();

      // Animate in
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 300);
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible]);

  const checkCanCheckIn = async () => {
    if (!userId) return;
    const canDoIt = await canCheckIn(userId, restaurantId);
    if (!canDoIt) {
      setState('already_checked');
      setMessage("You've already checked in here today!");
    }
  };

  const handlePinChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      verifyPin(fullPin);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyPin = async (enteredPin: string) => {
    Keyboard.dismiss();
    setState('verifying');

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (enteredPin === restaurantPin) {
      if (!userId) {
        setState('error');
        setMessage('Unable to check in. Please try again.');
        return;
      }
      // Record the check-in locally
      const result = await recordCheckIn(userId, restaurantId, restaurantName, 10);

      if (result.success) {
        // Also record to Supabase for social proof aggregation
        recordCheckinForSocialProof(restaurantId, restaurantName);

        setState('success');
        setPointsEarned(10);
        setMessage(result.message);

        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setState('error');
        setMessage(result.message);
      }
    } else {
      setState('error');
      setMessage('Invalid PIN. Please try again.');
      setPin(['', '', '', '']);

      // Re-focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 500);
    }
  };

  const handleRetry = () => {
    setPin(['', '', '', '']);
    setState('input');
    setMessage('');
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  };

  const renderContent = () => {
    switch (state) {
      case 'already_checked':
        return (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, styles.warningCircle]}>
              <Ionicons name="time-outline" size={48} color={colors.warning} />
            </View>
            <Text style={styles.stateTitle}>Already Checked In</Text>
            <Text style={styles.stateMessage}>{message}</Text>
            <Text style={styles.stateHint}>Come back tomorrow for more points!</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        );

      case 'verifying':
        return (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.stateTitle}>Verifying PIN...</Text>
          </View>
        );

      case 'success':
        return (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, styles.successCircle]}>
              <Ionicons name="checkmark" size={48} color={colors.success} />
            </View>
            <Text style={styles.stateTitle}>Check-In Successful!</Text>
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>+{pointsEarned}</Text>
              <Text style={styles.pointsLabel}>points</Text>
            </View>
            <Text style={styles.stateMessage}>{message}</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.stateContainer}>
            <View style={[styles.iconCircle, styles.errorCircle]}>
              <Ionicons name="close" size={48} color={colors.error} />
            </View>
            <Text style={styles.stateTitle}>Oops!</Text>
            <Text style={styles.stateMessage}>{message}</Text>
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
              <View style={styles.rewardIcon}>
                <Ionicons name="gift" size={32} color={colors.accent} />
              </View>
              <Text style={styles.title}>Check In</Text>
              <Text style={styles.subtitle}>at {restaurantName}</Text>
            </View>

            <Text style={styles.instructions}>
              Ask your server for the 4-digit PIN to earn rewards points!
            </Text>

            <View style={styles.pinContainer}>
              {pin.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[styles.pinInput, digit ? styles.pinInputFilled : null]}
                  value={digit}
                  onChangeText={(value) => handlePinChange(value, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            <Text style={styles.hint}>
              Earn 10 points for each check-in (once per day)
            </Text>
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
    maxWidth: 340,
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
    marginBottom: 20,
  },
  closeIcon: {
    position: 'absolute',
    top: -8,
    right: -100,
    padding: 8,
  },
  rewardIcon: {
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
  },
  instructions: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  pinContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  pinInput: {
    width: 56,
    height: 64,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.cardBgElevated,
  },
  pinInputFilled: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}10`,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
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
  warningCircle: {
    backgroundColor: `${colors.warning}20`,
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
  stateHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginVertical: 12,
  },
  pointsText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textOnAccent,
  },
  pointsLabel: {
    fontSize: 14,
    color: colors.textOnAccent,
    marginLeft: 4,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: radius.full,
    marginTop: 20,
  },
  retryButtonText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: colors.cardBgElevated,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: radius.full,
    marginTop: 20,
  },
  closeButtonText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
});
