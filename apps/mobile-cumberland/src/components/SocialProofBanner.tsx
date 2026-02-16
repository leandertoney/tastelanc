import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, radius, typography } from '../constants/colors';
import { usePlatformSocialProof } from '../hooks';
import type { RootStackParamList } from '../navigation/types';
import { BRAND } from '../config/brand';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type NavigationTarget =
  | { screen: keyof RootStackParamList }
  | { tab: string };

interface BannerMessage {
  text: string;
  subtext: string | null;
  cta: string;
  target: NavigationTarget;
}

const FALLBACK_MESSAGE: BannerMessage = {
  text: `Vote for ${BRAND.cityPossessive} Best`,
  subtext: null,
  cta: 'Vote',
  target: { screen: 'VoteCenter' },
};

/**
 * SocialProofBanner - Displays platform activity with animated cycling text
 *
 * Each message has its own CTA button and navigation target.
 * Text cycles through different messages with smooth fade animation.
 */
export default function SocialProofBanner() {
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading } = usePlatformSocialProof();
  const [messageIndex, setMessageIndex] = useState(0);
  const textOpacity = useSharedValue(1);

  // Build messages array from live data, each with its own CTA + nav target
  const messages: BannerMessage[] = data ? [
    {
      text: data.checkinBannerText,
      subtext: data.checkinsThisWeek > 0 ? `${data.checkinsThisWeek} this week` : null,
      cta: 'Check In',
      target: { tab: 'Rewards' },
    },
    // Only show if we have live counts
    data.happyHoursBannerText ? {
      text: data.happyHoursBannerText,
      subtext: null,
      cta: 'View',
      target: { screen: 'HappyHoursViewAll' },
    } : null,
    data.specialsBannerText ? {
      text: data.specialsBannerText,
      subtext: null,
      cta: 'View',
      target: { screen: 'SpecialsViewAll' },
    } : null,
    // Static voting CTA (no countdown)
    FALLBACK_MESSAGE,
  ].filter((m): m is BannerMessage => m !== null && !!m.text) : [FALLBACK_MESSAGE];

  // Cycle through messages
  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      // Fade out
      textOpacity.value = withSequence(
        withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) })
      );

      // Change message slightly after fade out starts
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [messages.length]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (isLoading && !messages.length) {
    return null;
  }

  const currentMessage = messages[messageIndex] || messages[0];

  const handlePress = () => {
    try {
      const { target } = currentMessage;
      if ('tab' in target) {
        navigation.navigate('MainTabs', { screen: target.tab } as any);
      } else {
        navigation.navigate(target.screen as any);
      }
    } catch {
      // Fallback — navigate to VoteCenter if anything goes wrong
      navigation.navigate('VoteCenter');
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Animated.View style={[styles.content, animatedTextStyle]}>
        <Text style={styles.mainText} numberOfLines={1}>
          {currentMessage.text}
        </Text>
        {currentMessage.subtext && (
          <Text style={styles.subtext} numberOfLines={1}>{currentMessage.subtext}</Text>
        )}
      </Animated.View>
      <Animated.View style={[styles.arrow, animatedTextStyle]}>
        <Text style={styles.arrowText}>{currentMessage.cta}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(15,30,46,0.12)',
    borderColor: 'rgba(15,30,46,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  mainText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.text,
  },
  subtext: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: 2,
  },
  arrow: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  arrowText: {
    color: colors.textOnAccent,
    fontSize: typography.caption1,
    fontWeight: '700',
  },
});
