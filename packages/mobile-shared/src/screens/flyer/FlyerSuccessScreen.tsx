import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { spacing, radius, typography } from '../../constants/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FlyerSuccess'>;
type Route = RouteProp<RootStackParamList, 'FlyerSuccess'>;

export default function FlyerSuccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { publishingPath, claimUrl, venueName } = route.params;
  const styles = useStyles();
  const colors = getColors();

  const PATH_CONFIG = {
    venue_free: {
      icon: 'checkmark-circle' as const,
      iconColor: colors.success,
      getTitle: (venueName?: string) =>
        venueName ? `Event added to ${venueName}!` : 'Event submitted!',
      subtitle: "It will appear in the app after a quick review.",
    },
    promoter_paid: {
      icon: 'megaphone' as const,
      iconColor: colors.gold,
      getTitle: () => 'Event promoted!',
      subtitle: 'Your event will be featured once payment is confirmed. Locals and tourists will be notified.',
    },
    send_to_organizer: {
      icon: 'share-social' as const,
      iconColor: colors.info,
      getTitle: () => 'Link ready to share!',
      subtitle: "You'll earn credits when the organizer claims and publishes the event.",
    },
  };

  const config = PATH_CONFIG[publishingPath as keyof typeof PATH_CONFIG] || PATH_CONFIG.venue_free;

  const handleShareLink = async () => {
    if (!claimUrl) return;
    try {
      await Share.share({
        message: `Check out this event on ${getBrand().appName}: ${claimUrl}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleDone = () => {
    navigation.popToTop();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={config.icon} size={72} color={config.iconColor} />
        </View>

        <Text style={styles.title}>{config.getTitle(venueName)}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>

        {/* Claim URL section for send_to_organizer */}
        {publishingPath === 'send_to_organizer' && claimUrl && (
          <View style={styles.claimSection}>
            <Text style={styles.claimLabel}>Claim Link</Text>
            <View style={styles.claimUrlBox}>
              <Text style={styles.claimUrlText} numberOfLines={2}>{claimUrl}</Text>
            </View>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareLink}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={20} color={colors.text} />
              <Text style={styles.shareButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.7}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: typography.title2,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: typography.callout,
    color: colors.textMuted,
    textAlign: 'center' as const,
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  claimSection: {
    width: '100%',
    marginTop: spacing.xl,
    alignItems: 'center' as const,
  },
  claimLabel: {
    fontSize: typography.caption1,
    fontWeight: '600' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  claimUrlBox: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  claimUrlText: {
    fontSize: typography.caption1,
    color: colors.info,
    textAlign: 'center' as const,
  },
  shareButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  shareButtonText: {
    fontSize: typography.callout,
    fontWeight: '600' as const,
    color: colors.text,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center' as const,
  },
  doneButtonText: {
    fontSize: typography.headline,
    fontWeight: '600' as const,
    color: colors.text,
  },
}));
