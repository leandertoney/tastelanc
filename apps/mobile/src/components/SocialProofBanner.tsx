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
import { usePlatformSocialProof, usePersonalStats } from '../hooks';
import { useAuth } from '../hooks/useAuth';
import type { RootStackParamList } from '../navigation/types';

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
  text: 'Vote for Lancaster\'s Best',
  subtext: null,
  cta: 'Vote',
  target: { screen: 'VoteCenter' },
};

/**
 * SocialProofBanner — Smart banner that adapts based on user history
 *
 * FOR USERS WITH ACTIVITY: Personalized messages ("You've visited 5 restaurants this month")
 * FOR USERS WITHOUT HISTORY / LOGGED OUT: FOMO messages using real live community data
 *   ("47 people checked in today", "[Restaurant] just jumped to #2")
 */
export default function SocialProofBanner() {
  const navigation = useNavigation<NavigationProp>();
  const { userId, isAnonymous } = useAuth();
  const { data: platformData, isLoading: platformLoading } = usePlatformSocialProof();
  const { data: personal } = usePersonalStats();
  const [messageIndex, setMessageIndex] = useState(0);
  const textOpacity = useSharedValue(1);

  const hasPersonalHistory = !isAnonymous && userId && (
    (personal?.checkinsThisMonth ?? 0) > 0 ||
    personal?.lastVisitedName != null
  );

  // Build personalized messages if user has activity
  const personalMessages: BannerMessage[] = (() => {
    if (!hasPersonalHistory || !personal) return [];
    const msgs: BannerMessage[] = [];
    if (personal.checkinsThisMonth > 0) {
      msgs.push({
        text: `🔥 You've visited ${personal.checkinsThisMonth} restaurant${personal.checkinsThisMonth !== 1 ? 's' : ''} this month`,
        subtext: 'Keep exploring Lancaster',
        cta: 'My Visits',
        target: { screen: 'MyRestaurants' },
      });
    }
    if (personal.votesRemainingThisMonth > 0) {
      msgs.push({
        text: `🗳️ ${personal.votesRemainingThisMonth} vote${personal.votesRemainingThisMonth !== 1 ? 's' : ''} left this month`,
        subtext: "Shape Lancaster's rankings",
        cta: 'Vote',
        target: { screen: 'VoteCenter' },
      });
    }
    if (personal.lastVisitedName && personal.lastVisitedDaysAgo != null) {
      const daysAgo = personal.lastVisitedDaysAgo;
      msgs.push({
        text: daysAgo === 0
          ? `📍 You checked in at ${personal.lastVisitedName} today`
          : daysAgo === 1
          ? `📍 Last visited ${personal.lastVisitedName} yesterday`
          : `📍 Last at ${personal.lastVisitedName} ${daysAgo}d ago`,
        subtext: 'Explore something new today',
        cta: 'Explore',
        target: { tab: 'Explore' },
      });
    }
    return msgs;
  })();

  // Community / FOMO messages from live platform data
  const communityMessages: BannerMessage[] = (() => {
    if (!platformData) return [FALLBACK_MESSAGE];
    const msgs: BannerMessage[] = [];
    if (platformData.checkinBannerText) {
      msgs.push({
        text: platformData.checkinBannerText,
        subtext: platformData.checkinsThisWeek > 0 ? `${platformData.checkinsThisWeek} this week` : null,
        cta: 'Check In',
        target: { tab: 'Rewards' },
      });
    }
    if (platformData.happyHoursBannerText) {
      msgs.push({
        text: platformData.happyHoursBannerText,
        subtext: null,
        cta: 'View',
        target: { screen: 'HappyHoursViewAll' },
      });
    }
    if (platformData.specialsBannerText) {
      msgs.push({
        text: platformData.specialsBannerText,
        subtext: null,
        cta: 'View',
        target: { screen: 'SpecialsViewAll' },
      });
    }
    msgs.push(FALLBACK_MESSAGE);
    return msgs;
  })();

  // Personalized users get personal messages first, then community
  // New / anonymous users get community FOMO messages only
  const messages: BannerMessage[] = hasPersonalHistory
    ? [...personalMessages, ...communityMessages]
    : communityMessages;

  const finalMessages = messages.length > 0 ? messages : [FALLBACK_MESSAGE];

  // Reset index when messages change
  useEffect(() => {
    setMessageIndex(0);
  }, [hasPersonalHistory]);

  // Cycle through messages
  useEffect(() => {
    if (finalMessages.length <= 1) return;

    const interval = setInterval(() => {
      textOpacity.value = withSequence(
        withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 300, easing: Easing.in(Easing.ease) })
      );
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % finalMessages.length);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [finalMessages.length]);

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  if (platformLoading && !finalMessages.length) return null;

  const currentMessage = finalMessages[messageIndex] || finalMessages[0];

  const handlePress = () => {
    try {
      const { target } = currentMessage;
      if ('tab' in target) {
        navigation.navigate('MainTabs', { screen: target.tab } as any);
      } else {
        navigation.navigate(target.screen as any);
      }
    } catch {
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
    backgroundColor: 'rgba(164, 30, 34, 0.15)',
    borderColor: 'rgba(164, 30, 34, 0.3)',
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
    color: colors.text,
    fontSize: typography.caption1,
    fontWeight: '700',
  },
});
