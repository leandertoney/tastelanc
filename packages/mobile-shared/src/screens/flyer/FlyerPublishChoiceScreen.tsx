import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import { createDraft, createCheckout } from '../../lib/flyer';
import { getColors, getBrand } from '../../config/theme';
import { createLazyStyles } from '../../utils/lazyStyles';
import { withAlpha } from '../../utils/colorUtils';
import { spacing, radius, typography } from '../../constants/spacing';

type Nav = NativeStackNavigationProp<RootStackParamList, 'FlyerPublishChoice'>;
type Route = RouteProp<RootStackParamList, 'FlyerPublishChoice'>;

type PublishingPath = 'venue_free' | 'promoter_paid' | 'send_to_organizer';

export default function FlyerPublishChoiceScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { draftData } = route.params;
  const styles = useStyles();
  const colors = getColors();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPath, setSelectedPath] = useState<PublishingPath | null>(null);

  const handleSelect = async (path: PublishingPath) => {
    if (isSubmitting) return;

    // Venue free requires a matched venue
    if (path === 'venue_free' && !draftData.venueId) {
      Alert.alert(
        'Venue Required',
        'Please go back and select a venue to submit a free venue listing.'
      );
      return;
    }

    setSelectedPath(path);
    setIsSubmitting(true);

    try {
      const result = await createDraft({
        flyerImageUrl: draftData.flyerImageUrl,
        extractedJson: draftData.extractedJson,
        editedJson: draftData.editedJson,
        matchedVenueId: draftData.venueId,
        publishingPath: path,
      });

      if (path === 'venue_free') {
        navigation.navigate('FlyerSuccess', {
          draftId: result.draft_id,
          publishingPath: path,
          venueName: draftData.venueName,
        });
      } else if (path === 'promoter_paid') {
        // Create Stripe checkout and open in browser
        const checkout = await createCheckout(result.draft_id);
        if (checkout.checkout_url) {
          await WebBrowser.openBrowserAsync(checkout.checkout_url);
        }
        navigation.navigate('FlyerSuccess', {
          draftId: result.draft_id,
          publishingPath: path,
        });
      } else if (path === 'send_to_organizer') {
        // Share the claim link
        const claimUrl = result.claim_url;
        if (claimUrl) {
          try {
            await Share.share({
              message: `Your event "${draftData.eventName}" can be listed on ${getBrand().appName}. Claim and publish it here: ${claimUrl}`,
            });
          } catch {
            // User cancelled share, still navigate to success
          }
        }
        navigation.navigate('FlyerSuccess', {
          draftId: result.draft_id,
          publishingPath: path,
          claimUrl: result.claim_url,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
      setSelectedPath(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>How should this event be listed?</Text>
        <Text style={styles.subtitle}>Choose the best option for this event.</Text>

        <View style={styles.options}>
          {/* Option A: Free Venue Listing */}
          <TouchableOpacity
            style={[styles.optionCard, !draftData.venueId && styles.optionDisabled]}
            onPress={() => handleSelect('venue_free')}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="business-outline" size={28} color={colors.accent} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Add to Venue Listing</Text>
              <Text style={styles.optionLabel}>Free</Text>
              <Text style={styles.optionDesc}>This is a regular venue event (trivia, karaoke, live music, etc.)</Text>
            </View>
            {isSubmitting && selectedPath === 'venue_free' && (
              <ActivityIndicator color={colors.accent} />
            )}
          </TouchableOpacity>

          {/* Option B: Paid Promotion */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelect('promoter_paid')}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="megaphone-outline" size={28} color={colors.accent} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Promote This Event</Text>
              <Text style={styles.optionLabelPaid}>$50</Text>
              <Text style={styles.optionDesc}>
                For bands, DJs, touring acts, and special events. Featured placement + push notifications to locals and tourists.
              </Text>
            </View>
            {isSubmitting && selectedPath === 'promoter_paid' && (
              <ActivityIndicator color={colors.accent} />
            )}
          </TouchableOpacity>

          {/* Option C: Send to Organizer */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={() => handleSelect('send_to_organizer')}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="share-outline" size={28} color={colors.accent} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>Send to Organizer</Text>
              <Text style={styles.optionLabel}>Earn Credits</Text>
              <Text style={styles.optionDesc}>
                Share a link with the event organizer to claim and publish. You earn credits when they publish.
              </Text>
            </View>
            {isSubmitting && selectedPath === 'send_to_organizer' && (
              <ActivityIndicator color={colors.accent} />
            )}
          </TouchableOpacity>
        </View>
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
    paddingTop: spacing.lg,
  },
  title: {
    fontSize: typography.title2,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.callout,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  options: {
    gap: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: withAlpha(colors.accent, 0.1),
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.headline,
    fontWeight: '600' as const,
    color: colors.text,
  },
  optionLabel: {
    fontSize: typography.caption1,
    fontWeight: '600' as const,
    color: colors.success,
    marginTop: 2,
  },
  optionLabelPaid: {
    fontSize: typography.caption1,
    fontWeight: '700' as const,
    color: colors.gold,
    marginTop: 2,
  },
  optionDesc: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
}));
