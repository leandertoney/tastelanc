import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { useAuth } from '../context/AuthContext';
import { useSignUpModal } from '../context/SignUpModalContext';
import { getSessionCount } from '../lib/reviewPrompts';

const NUDGE_DISMISSED_KEY = '@tastelanc_signin_nudge_dismissed';
const NUDGE_DISMISS_DAYS = 7; // Don't show again for 7 days after dismiss
const MIN_SESSIONS_FOR_NUDGE = 3;

export default function SignInNudge() {
  const { isAnonymous, isLoading } = useAuth();
  const { showSignUpModal } = useSignUpModal();
  const styles = useStyles();
  const colors = getColors();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;
    if (!isAnonymous) return; // Already signed in

    checkShouldShow();
  }, [isAnonymous, isLoading]);

  const checkShouldShow = async () => {
    try {
      // Check if dismissed recently
      const dismissed = await AsyncStorage.getItem(NUDGE_DISMISSED_KEY);
      if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const daysSince = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < NUDGE_DISMISS_DAYS) return;
      }

      // Check session count
      const sessions = await getSessionCount();
      if (sessions < MIN_SESSIONS_FOR_NUDGE) return;

      // Show the nudge with a delay so it doesn't appear instantly on launch
      setTimeout(() => {
        setVisible(true);
        Animated.parallel([
          Animated.spring(slideAnim, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 8,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    } catch (error) {
      console.warn('[SignInNudge] Error checking nudge state:', error);
    }
  };

  const dismiss = async () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));

    try {
      await AsyncStorage.setItem(NUDGE_DISMISSED_KEY, new Date().toISOString());
    } catch (error) {
      console.warn('[SignInNudge] Error saving dismiss:', error);
    }
  };

  const handleSignIn = () => {
    dismiss();
    showSignUpModal({
      action: 'unlock the full experience',
    });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.card}>
        <TouchableOpacity style={styles.closeButton} onPress={dismiss}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.iconRow}>
          <View style={[styles.iconCircle, { backgroundColor: `${colors.accent}20` }]}>
            <Ionicons name="person-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Sign in for the full experience</Text>
            <Text style={styles.subtitle}>
              Save favorites, earn rewards, and get personalized picks
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
          <Text style={styles.signInButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    position: 'absolute' as const,
    bottom: 100, // Above the tab bar
    left: 16,
    right: 16,
    zIndex: 50,
  },
  card: {
    backgroundColor: colors.cardBgElevated,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    padding: 8,
    zIndex: 1,
  },
  iconRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
    paddingRight: 24, // Space for close button
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  signInButton: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: 'center' as const,
  },
  signInButtonText: {
    color: colors.textOnAccent,
    fontSize: 15,
    fontWeight: '600' as const,
  },
}));
