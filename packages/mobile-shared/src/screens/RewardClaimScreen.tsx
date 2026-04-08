import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';

type RewardClaimRouteProp = RouteProp<RootStackParamList, 'RewardClaim'>;

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const styles = useStyles();
  const colors = getColors();
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft > 0]);

  if (secondsLeft <= 0) {
    return <Text style={styles.expired}>This offer has expired</Text>;
  }

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={styles.timerContainer}>
      <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
      <Text style={styles.timerText}>{minutes}:{seconds} remaining</Text>
    </View>
  );
}

export default function RewardClaimScreen() {
  const navigation = useNavigation();
  const route = useRoute<RewardClaimRouteProp>();
  const { claim_token, restaurant_name, reward_description, expires_at } = route.params;

  const styles = useStyles();
  const colors = getColors();

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&color=000000&bgcolor=FFFFFF&data=${encodeURIComponent(claim_token)}`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <Text style={styles.headline}>Show to Staff</Text>
        <Text style={styles.restaurantName}>{restaurant_name}</Text>

        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Image
            source={{ uri: qrUrl }}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.tokenLabel}>{claim_token}</Text>

        {/* Reward info */}
        <View style={styles.rewardBox}>
          <Ionicons name="gift" size={20} color={colors.accent} />
          <Text style={styles.rewardDescription}>{reward_description}</Text>
        </View>

        <Text style={styles.disclaimer}>
          Reward provided by {restaurant_name}. App does not fulfill or validate this offer.
        </Text>

        {/* Countdown */}
        <CountdownTimer expiresAt={expires_at} />

        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    content: {
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    headerRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
    },
    backBtn: {
      padding: 4,
    },
    headline: {
      fontSize: 28,
      fontWeight: '800',
      color: '#F0C040',
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    restaurantName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    qrContainer: {
      backgroundColor: '#fff',
      borderRadius: radius.md,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 8,
      elevation: 4,
    },
    qrImage: {
      width: 240,
      height: 240,
    },
    tokenLabel: {
      fontSize: 11,
      fontFamily: 'monospace',
      color: colors.textSecondary,
      letterSpacing: 1,
    },
    rewardBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      backgroundColor: colors.cardBg,
      borderRadius: radius.md,
      padding: spacing.md,
      width: '100%',
    },
    rewardDescription: {
      fontSize: 15,
      color: colors.accent,
      fontWeight: '600',
      flex: 1,
    },
    disclaimer: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 16,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    timerText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontVariant: ['tabular-nums'],
    },
    expired: {
      fontSize: 14,
      color: '#E63946',
      fontWeight: '600',
    },
    doneBtn: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      width: '100%',
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    doneBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textOnAccent,
    },
  };
});
