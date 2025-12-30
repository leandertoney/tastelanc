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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SocialProofBannerProps {
  variant?: 'voting' | 'checkins' | 'community';
  onPress?: () => void;
}

// Fallback message when no live data available
const FALLBACK_MESSAGE = { text: 'Vote for Lancaster\'s Best', subtext: null };

/**
 * SocialProofBanner - Displays platform activity with animated cycling text
 *
 * Text cycles through different messages with smooth fade animation
 * Red pill container stays fixed
 */
export default function SocialProofBanner({ variant = 'voting', onPress }: SocialProofBannerProps) {
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading } = usePlatformSocialProof();
  const [messageIndex, setMessageIndex] = useState(0);
  const textOpacity = useSharedValue(1);

  // Build messages array from live data
  const messages = data ? [
    { text: data.votingBannerText, subtext: data.restaurantsCompeting },
    { text: data.checkinBannerText, subtext: data.checkinsThisWeek > 0 ? `${data.checkinsThisWeek} this week` : null },
    // Only show if we have live counts
    data.happyHoursBannerText ? { text: data.happyHoursBannerText, subtext: null } : null,
    data.specialsBannerText ? { text: data.specialsBannerText, subtext: null } : null,
    // Static fallback
    FALLBACK_MESSAGE,
  ].filter((m): m is { text: string; subtext: string | null } => m !== null && !!m.text) : [FALLBACK_MESSAGE];

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

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (variant === 'voting') {
      navigation.navigate('VoteCenter');
    }
  };

  const currentMessage = messages[messageIndex] || messages[0];

  // Styling based on variant (keeping accent red as default)
  const getColors = () => {
    switch (variant) {
      case 'checkins':
        return {
          textColor: colors.valueGreen,
          bgColor: colors.valueGreenLight,
          borderColor: colors.valueGreenBorder,
          buttonBgColor: colors.valueGreen,
        };
      case 'community':
        return {
          textColor: colors.gold,
          bgColor: colors.goldLight,
          borderColor: colors.goldBorder,
          buttonBgColor: colors.gold,
        };
      case 'voting':
      default:
        return {
          textColor: colors.text, // White text for readability
          bgColor: 'rgba(164, 30, 34, 0.15)',
          borderColor: 'rgba(164, 30, 34, 0.3)',
          buttonBgColor: colors.accent, // Red button stays red
        };
    }
  };

  const colorScheme = getColors();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colorScheme.bgColor,
          borderColor: colorScheme.borderColor,
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Animated.View style={[styles.content, animatedTextStyle]}>
        <Text style={[styles.mainText, { color: colorScheme.textColor }]} numberOfLines={1}>
          {currentMessage.text}
        </Text>
        {currentMessage.subtext && (
          <Text style={styles.subtext} numberOfLines={1}>{currentMessage.subtext}</Text>
        )}
      </Animated.View>
      {variant === 'voting' && (
        <View style={[styles.arrow, { backgroundColor: colorScheme.buttonBgColor }]}>
          <Text style={styles.arrowText}>Vote</Text>
        </View>
      )}
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
  },
  arrowText: {
    color: colors.text,
    fontSize: typography.caption1,
    fontWeight: '700',
  },
});
