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

// Message type with CTA info
interface BannerMessage {
  text: string;
  subtext: string | null;
  ctaText: string;
  navigateTo: 'VoteCenter' | 'HappyHoursViewAll' | 'EntertainmentViewAll' | 'EventsViewAll' | 'Rewards' | 'BlogViewAll';
}

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

  // Build messages array for main sections with CTAs
  const messages: BannerMessage[] = [
    // Voting
    {
      text: data?.votingBannerText || '🗳️ Vote for Lancaster\'s Best',
      subtext: data?.restaurantsCompeting || null,
      ctaText: 'Vote',
      navigateTo: 'VoteCenter'
    },
    // Happy Hours
    {
      text: data?.happyHoursBannerText || '🍹 Find today\'s happy hour deals',
      subtext: null,
      ctaText: 'View',
      navigateTo: 'HappyHoursViewAll'
    },
    // Entertainment
    {
      text: '🎵 Live music, trivia & more tonight',
      subtext: null,
      ctaText: 'Explore',
      navigateTo: 'EntertainmentViewAll'
    },
    // Events
    {
      text: data?.specialsBannerText || '📅 Discover upcoming events',
      subtext: null,
      ctaText: 'View',
      navigateTo: 'EventsViewAll'
    },
    // Rewards / Check-ins
    {
      text: data?.checkinBannerText || '📍 Check in to earn rewards',
      subtext: data?.checkinsThisWeek && data.checkinsThisWeek > 0 ? `${data.checkinsThisWeek} this week` : null,
      ctaText: 'Rewards',
      navigateTo: 'Rewards'
    },
    // Blog
    {
      text: '📖 Tips from Rosie\'s Blog',
      subtext: null,
      ctaText: 'Read',
      navigateTo: 'BlogViewAll'
    },
  ];

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
    if (onPress) {
      onPress();
    } else {
      navigation.navigate(currentMessage.navigateTo);
    }
  };

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
      <View style={[styles.arrow, { backgroundColor: colorScheme.buttonBgColor }]}>
        <Text style={styles.arrowText}>{currentMessage.ctaText}</Text>
      </View>
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
