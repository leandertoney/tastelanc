/**
 * HappyHourReminderCard
 *
 * Shown under the soonest happy hour on a restaurant's Happy Hours tab.
 * Premium users can toggle a "remind me 30 min before" local notification.
 * Free users see the same card as a door to the paywall. The happy hour
 * itself is never hidden; TasteLanc+ only sells the reminder.
 */
import { useEffect, useState, useCallback } from 'react';
import { View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { trackClick } from '../lib/analytics';
import { isReminderSet, setReminder, clearReminder, REMINDER_LEAD_MINUTES } from '../lib/happyHourReminders';
import type { HappyHour } from '../types/database';

interface Props {
  happyHour: HappyHour;
  restaurantId: string;
  restaurantName: string;
  userId: string | null | undefined;
  isPremium: boolean;
  /** Called for free users when they interact with the card. */
  onUpsell: () => void;
}

export default function HappyHourReminderCard({
  happyHour,
  restaurantId,
  restaurantName,
  userId,
  isPremium,
  onUpsell,
}: Props) {
  const styles = useStyles();
  const colors = getColors();
  const brand = getBrand();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    isReminderSet(userId, happyHour.id).then((set) => {
      if (!cancelled) setEnabled(set);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, happyHour.id]);

  const daysLabel =
    happyHour.days_of_week.length === 7
      ? 'Every day'
      : happyHour.days_of_week.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');

  const openPaywall = useCallback(() => {
    trackClick('paywall_open_happy_hour_reminder', restaurantId);
    onUpsell();
  }, [onUpsell, restaurantId]);

  const toggle = useCallback(
    async (next: boolean) => {
      if (!isPremium) {
        openPaywall();
        return;
      }
      if (busy) return;
      setBusy(true);
      try {
        if (next) {
          const ok = await setReminder(userId, happyHour, restaurantId, restaurantName);
          if (!ok) {
            Alert.alert(
              'Notifications are off',
              `Turn on notifications for ${brand.appName} in Settings to get happy hour reminders.`
            );
            setEnabled(false);
          } else {
            trackClick('happy_hour_reminder_set', restaurantId);
            setEnabled(true);
          }
        } else {
          await clearReminder(userId, happyHour.id);
          trackClick('happy_hour_reminder_cleared', restaurantId);
          setEnabled(false);
        }
      } finally {
        setBusy(false);
      }
    },
    [isPremium, busy, userId, happyHour, restaurantId, restaurantName, openPaywall, brand.appName]
  );

  return (
    <View style={styles.card}>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{brand.appName.toUpperCase()}+</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="alarm-outline" size={22} color={colors.gold} style={styles.icon} />
        <View style={styles.textCol}>
          <Text style={styles.title}>Remind me {REMINDER_LEAD_MINUTES} min before</Text>
          <Text style={styles.subtitle}>
            {daysLabel}, for {happyHour.name.toLowerCase() === 'happy hour' ? 'this happy hour' : happyHour.name}
          </Text>
        </View>
        <Switch
          value={isPremium && enabled}
          onValueChange={toggle}
          disabled={busy}
          trackColor={{ false: colors.border, true: colors.gold }}
          thumbColor="#FFFFFF"
          accessibilityLabel="Happy hour reminder"
        />
      </View>
      {!isPremium && (
        <TouchableOpacity style={styles.cta} onPress={openPaywall} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Try free for 3 days</Text>
        </TouchableOpacity>
      )}
      {isPremium && enabled && (
        <Text style={styles.confirm}>You'll get a notification {REMINDER_LEAD_MINUTES} minutes before it starts.</Text>
      )}
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    padding: spacing.md,
    paddingTop: spacing.md + 6,
    marginBottom: 10,
  },
  pill: {
    position: 'absolute' as const,
    top: -9,
    left: 12,
    backgroundColor: colors.gold,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 0.6,
    color: '#1A1A1A',
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  icon: { marginRight: 2 },
  textCol: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center' as const,
  },
  ctaText: {
    color: colors.textOnAccent,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  confirm: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
}));
