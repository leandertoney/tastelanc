import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { getColors, getBrand } from '../config/theme';
import { getLocationPermissionStatus, requestBackgroundPermission } from '../lib/radar';

const STORAGE_KEY = '@tastelanc_location_upgrade_dismissed';
const DISMISS_DURATION_DAYS = 30; // re-prompt after 30 days if still foreground-only

/**
 * LocationUpgradePrompt
 *
 * Shows a bottom-sheet modal prompting the user to upgrade from "While Using"
 * to "Always Allow" location permission. This unlocks automatic check-ins and
 * real-time buzz detection.
 *
 * Shown once after a user's first manual check-in, then suppressed for 30 days.
 * Never shown to users who already have "Always Allow" or who have denied location.
 */
export function LocationUpgradePrompt(): React.ReactElement | null {
  const [step, setStep] = useState<'disclosure' | 'upgrade' | null>(null);
  const colors = getColors();
  const brand = getBrand();

  useEffect(() => {
    let cancelled = false;

    async function checkShouldShow() {
      try {
        // Don't show if user already has background permission
        const permission = await getLocationPermissionStatus();
        if (permission !== 'whenInUse') return;

        // Don't show if dismissed recently
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const { dismissedAt } = JSON.parse(raw);
          const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
          if (daysSince < DISMISS_DURATION_DAYS) return;
        }

        if (!cancelled) setStep('disclosure');
      } catch {
        // Silent — never block the user on this
      }
    }

    // Small delay so it doesn't compete with the check-in success animation
    const timer = setTimeout(checkShouldShow, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  async function handleEnable() {
    setStep(null);
    const granted = await requestBackgroundPermission();

    if (!granted) {
      // User declined the OS dialog — send them to Settings so they can change it manually
      Linking.openSettings();
    }
  }

  async function handleDismiss() {
    setStep(null);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {
      // Silent
    }
  }

  if (step === null) return null;

  const styles = makeStyles(colors);

  // Step 1: Prominent disclosure (required by Google Play policy before requesting
  // ACCESS_BACKGROUND_LOCATION). Must appear before the OS permission prompt and
  // must use plain language describing data collection purpose.
  if (step === 'disclosure') {
    return (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <View style={styles.disclosureOverlay}>
          <View style={styles.disclosureBox}>
            <View style={styles.iconRow}>
              <View style={styles.iconBg}>
                <Ionicons name="location" size={28} color={colors.accent} />
              </View>
            </View>

            <Text style={styles.title}>Background Location Access</Text>

            <Text style={styles.disclosureBody}>
              {brand.appName} collects your location data in the background to detect when
              you are at or near a restaurant, even when the app is closed or not in use.
            </Text>

            <Text style={styles.disclosureSubhead}>This data is used to:</Text>

            <View style={styles.bulletList}>
              <BulletRow text="Automatically record check-ins at restaurants you visit" colors={colors} />
              <BulletRow text={`Detect nearby restaurant activity ("buzz")`} colors={colors} />
              <BulletRow text="Send relevant alerts when you are near participating locations" colors={colors} />
            </View>

            <Text style={styles.disclosureBody}>
              Your location data is processed by Radar (radar.com), our geofencing provider.
              It is not sold to third parties.{'\n\n'}
              You can change this permission at any time in your device Settings.
            </Text>

            <TouchableOpacity style={styles.enableBtn} onPress={() => setStep('upgrade')}>
              <Text style={styles.enableBtnText}>I understand, continue</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissBtnText}>No thanks</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  // Step 2: Feature marketing sheet (shown after disclosure is accepted)
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleDismiss} />

      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.iconRow}>
          <View style={styles.iconBg}>
            <Ionicons name="location" size={28} color={colors.accent} />
          </View>
        </View>

        <Text style={styles.title}>Earn Points Automatically</Text>

        <Text style={styles.body}>
          Let {brand.appName} quietly notice when you're at a restaurant you love —
          no tapping required. You'll earn points, see what's buzzing nearby, and
          get better recommendations.
        </Text>

        <View style={styles.benefitList}>
          <BenefitRow icon="checkmark-circle" text="Auto check-in when you arrive" colors={colors} />
          <BenefitRow icon="flame"            text="See which spots are buzzing right now" colors={colors} />
          <BenefitRow icon="notifications"    text="Happy hour alerts when you're nearby" colors={colors} />
        </View>

        <Text style={styles.privacyNote}>
          Your location is only used to detect nearby restaurants. It's never sold or shared.
        </Text>

        <TouchableOpacity style={styles.enableBtn} onPress={handleEnable}>
          <Text style={styles.enableBtnText}>Enable Background Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
          <Text style={styles.dismissBtnText}>Not right now</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function BulletRow({
  text,
  colors,
}: {
  text: string;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
      <Text style={{ color: colors.accent, fontSize: 14, lineHeight: 20 }}>•</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, flex: 1 }}>{text}</Text>
    </View>
  );
}

function BenefitRow({
  icon,
  text,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  colors: ReturnType<typeof getColors>;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof getColors>) {
  return StyleSheet.create({
    disclosureOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    disclosureBox: {
      backgroundColor: colors.cardBg,
      borderRadius: 16,
      paddingHorizontal: 24,
      paddingVertical: 28,
      width: '100%',
    },
    disclosureBody: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 14,
    },
    disclosureSubhead: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 8,
    },
    bulletList: {
      marginBottom: 14,
      paddingLeft: 4,
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: colors.cardBg,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 24,
      paddingBottom: 40,
      paddingTop: 12,
    },
    handle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    iconRow: {
      alignItems: 'center',
      marginBottom: 16,
    },
    iconBg: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: `${colors.accent}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 12,
    },
    body: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 20,
    },
    benefitList: {
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    privacyNote: {
      color: colors.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 18,
    },
    enableBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    enableBtnText: {
      color: colors.textOnAccent,
      fontSize: 16,
      fontWeight: '700',
    },
    dismissBtn: {
      alignItems: 'center',
      paddingVertical: 8,
    },
    dismissBtnText: {
      color: colors.textSecondary,
      fontSize: 15,
    },
  });
}
