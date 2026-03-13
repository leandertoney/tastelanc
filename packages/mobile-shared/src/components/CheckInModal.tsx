import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
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
import { useQueryClient } from '@tanstack/react-query';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { recordCheckIn, canCheckIn } from '../lib/checkins';
import { POINT_VALUES } from '../lib/rewards';
import { recordPassiveVisit } from '../lib/visits';
import { useAuth } from '../hooks/useAuth';
import { useRecordCheckinForSocialProof } from '../hooks/useSocialProof';
import { rewardsQueryKeys } from '../hooks/useRewards';
import { requestReviewIfEligible } from '../lib/reviewPrompts';

interface CheckInModalProps {
  visible: boolean;
  onClose: () => void;
  restaurantId: string;
  restaurantName: string;
  restaurantPin?: string;
}

type CheckInState = 'input' | 'verifying' | 'success' | 'error' | 'already_checked';

export default function CheckInModal({
  visible,
  onClose,
  restaurantId,
  restaurantName,
  restaurantPin = '1987',
}: CheckInModalProps) {
  const styles = useStyles();
  const colors = getColors();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const recordCheckinForSocialProof = useRecordCheckinForSocialProof();
  const [pin, setPin] = useState(['', '', '', '']);
  const [state, setState] = useState<CheckInState>('input');
  const [message, setMessage] = useState('');
  const [pointsEarned, setPointsEarned] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setPin(['', '', '', '']);
      setState('input');
      setMessage('');

      checkCanCheckIn();

      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

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

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

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

    await new Promise((resolve) => setTimeout(resolve, 800));

    if (enteredPin === restaurantPin) {
      if (!userId) {
        setState('error');
        setMessage('Unable to check in. Please try again.');
        return;
      }
      const result = await recordCheckIn(userId, restaurantId, restaurantName);

      if (result.success) {
        const earned = result.pointsEarned ?? POINT_VALUES.checkin;

        recordCheckinForSocialProof(restaurantId, restaurantName, earned);

        recordPassiveVisit(userId, restaurantId, 'checkin')
          .then((visitResult) => {
            if (!visitResult.error) {
              queryClient.invalidateQueries({ queryKey: ['voting', 'eligibility'] });
              queryClient.invalidateQueries({ queryKey: ['visits', userId] });
            }
          })
          .catch((err) => {
            console.warn('[CheckInModal] Failed to record visit for voting:', err);
          });

        setState('success');
        setPointsEarned(earned);
        setMessage(result.message);

        queryClient.invalidateQueries({ queryKey: rewardsQueryKeys.balance });
        queryClient.invalidateQueries({ queryKey: rewardsQueryKeys.history });
        queryClient.invalidateQueries({ queryKey: ['profileStats'] });
        queryClient.invalidateQueries({ queryKey: ['checkinCount'] });
        queryClient.invalidateQueries({ queryKey: ['recentActivity'] });

        requestReviewIfEligible('check_in');

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
              {`Earn ${POINT_VALUES.checkin}+ points per check-in (once per day)`}
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

const useStyles = createLazyStyles((colors) => ({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as any),
    backgroundColor: colors.overlay,
  },
  modal: {
    width: '85%' as any,
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
    position: 'absolute' as const,
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
    fontWeight: '700' as const,
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
    textAlign: 'center' as const,
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
    fontWeight: '700' as const,
    textAlign: 'center' as const,
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
    textAlign: 'center' as const,
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
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 8,
  },
  stateMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center' as const,
  },
  stateHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 8,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'baseline' as const,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    marginVertical: 12,
  },
  pointsText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.text,
  },
  pointsLabel: {
    fontSize: 14,
    color: colors.text,
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
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
  },
}));
