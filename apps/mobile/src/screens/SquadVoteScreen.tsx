/**
 * Squad Vote Screen
 *
 * Friends open this via a shared poll ID.
 * They see the choices, tap to vote, and watch live results.
 * The winner is highlighted once all votes are in or poll expires.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types/database';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, spacing, typography } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'SquadVote'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SquadPoll {
  id: string;
  creator_id: string;
  title: string;
  restaurant_ids: string[];
  expires_at: string;
  created_at: string;
}

interface VoteTally {
  [restaurantId: string]: number;
}

// ─── Data hooks ───────────────────────────────────────────────────────────────

function usePoll(pollId: string) {
  return useQuery<SquadPoll | null>({
    queryKey: ['squadPoll', pollId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('squad_polls')
        .select('*')
        .eq('id', pollId)
        .single();
      if (error) return null;
      return data as SquadPoll;
    },
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000, // Live updates every 15s
  });
}

function usePollRestaurants(restaurantIds: string[]) {
  return useQuery({
    queryKey: ['squadPollRestaurants', restaurantIds.join(',')],
    queryFn: async (): Promise<Restaurant[]> => {
      if (!restaurantIds.length) return [];
      const { data } = await supabase
        .from('restaurants')
        .select('id, name, address, cover_image_url, logo_url, cuisine, categories')
        .in('id', restaurantIds);
      if (!data) return [];
      // Preserve the order from restaurant_ids
      const byId = new Map((data as any[]).map((r: any) => [r.id, r]));
      return restaurantIds.map(id => byId.get(id)).filter(Boolean) as unknown as Restaurant[];
    },
    enabled: restaurantIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

function useVotes(pollId: string) {
  return useQuery<VoteTally>({
    queryKey: ['squadVotes', pollId],
    queryFn: async () => {
      const { data } = await supabase
        .from('squad_poll_votes')
        .select('restaurant_id')
        .eq('poll_id', pollId);
      const tally: VoteTally = {};
      for (const v of data || []) {
        tally[v.restaurant_id] = (tally[v.restaurant_id] || 0) + 1;
      }
      return tally;
    },
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000, // Poll for live votes
  });
}

function useMyVote(pollId: string, userId: string | null) {
  return useQuery<string | null>({
    queryKey: ['squadMyVote', pollId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('squad_poll_votes')
        .select('restaurant_id')
        .eq('poll_id', pollId)
        .eq('voter_id', userId)
        .maybeSingle();
      return data?.restaurant_id || null;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SquadVoteScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<Props['route']>();
  const { pollId } = route.params;
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: poll, isLoading: loadingPoll } = usePoll(pollId);
  const { data: restaurants = [], isLoading: loadingRestaurants } = usePollRestaurants(poll?.restaurant_ids || []);
  const { data: votes = {}, isLoading: loadingVotes } = useVotes(pollId);
  const { data: myVote } = useMyVote(pollId, userId);

  const isLoading = loadingPoll || loadingRestaurants || loadingVotes;
  const totalVotes = Object.values(votes).reduce((s, n) => s + n, 0);
  const maxVotes = Math.max(...Object.values(votes), 0);
  const isExpired = poll ? new Date(poll.expires_at) < new Date() : false;

  // Winning restaurant (most votes, only shown if 2+ votes exist)
  const winnerIds = totalVotes >= 2
    ? Object.entries(votes)
        .filter(([, count]) => count === maxVotes && maxVotes > 0)
        .map(([id]) => id)
    : [];

  // Submit vote mutation
  const voteMutation = useMutation({
    mutationFn: async (restaurantId: string) => {
      if (!userId) throw new Error('Sign in to vote');
      const { error } = await supabase
        .from('squad_poll_votes')
        .insert({ poll_id: pollId, voter_id: userId, restaurant_id: restaurantId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squadVotes', pollId] });
      queryClient.invalidateQueries({ queryKey: ['squadMyVote', pollId, userId] });
    },
    onError: (err: any) => {
      if (err?.code === '23505') {
        Alert.alert('Already voted', 'You already voted in this poll.');
      } else {
        Alert.alert('Error', 'Could not submit your vote. Please try again.');
      }
    },
  });

  const handleVote = useCallback((restaurantId: string) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Create a free account to vote.');
      return;
    }
    if (myVote) {
      Alert.alert('Already voted', 'You already cast your vote in this poll!');
      return;
    }
    if (isExpired) {
      Alert.alert('Poll expired', 'This poll has closed.');
      return;
    }
    voteMutation.mutate(restaurantId);
  }, [userId, myVote, isExpired, voteMutation]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading poll...</Text>
      </SafeAreaView>
    );
  }

  if (!poll) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={styles.loadingText}>Poll not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Squad Poll</Text>
          <Text style={styles.headerSubtitle}>
            {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {isExpired ? 'Closed' : 'Live'}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Status banner */}
      {isExpired && (
        <View style={styles.expiredBanner}>
          <Ionicons name="time-outline" size={16} color={colors.text} />
          <Text style={styles.expiredText}>This poll has closed</Text>
        </View>
      )}
      {winnerIds.length > 0 && !isExpired && (
        <View style={styles.winnerBanner}>
          <Text style={styles.winnerBannerText}>🏆 Leading the vote!</Text>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pollTitle}>{poll.title}</Text>

        {restaurants.map((restaurant, index) => {
          const voteCount = votes[restaurant.id] || 0;
          const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isWinner = winnerIds.includes(restaurant.id);
          const isMyPick = myVote === restaurant.id;
          const hasVoted = !!myVote;

          return (
            <TouchableOpacity
              key={restaurant.id}
              style={[
                styles.card,
                isWinner && styles.cardWinner,
                isMyPick && styles.cardMyPick,
              ]}
              onPress={() => handleVote(restaurant.id)}
              activeOpacity={hasVoted || isExpired ? 1 : 0.7}
              disabled={voteMutation.isPending}
            >
              {/* Rank number */}
              <View style={[styles.rankBadge, isWinner && styles.rankBadgeWinner]}>
                <Text style={styles.rankText}>
                  {isWinner ? '🏆' : `${index + 1}`}
                </Text>
              </View>

              {/* Restaurant image */}
              {restaurant.cover_image_url || restaurant.logo_url ? (
                <Image
                  source={{ uri: restaurant.cover_image_url || restaurant.logo_url || undefined }}
                  style={styles.thumb}
                />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Ionicons name="restaurant" size={20} color={colors.textMuted} />
                </View>
              )}

              {/* Info + vote bar */}
              <View style={styles.info}>
                <View style={styles.infoTop}>
                  <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
                  {isMyPick && (
                    <View style={styles.myPickBadge}>
                      <Text style={styles.myPickText}>Your vote</Text>
                    </View>
                  )}
                </View>
                {restaurant.address && (
                  <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
                )}

                {/* Vote bar (shown after voting or if there are votes) */}
                {(hasVoted || totalVotes > 0) && (
                  <View style={styles.voteBarRow}>
                    <View style={styles.voteBarBg}>
                      <View style={[styles.voteBarFill, { width: `${pct}%` as any }, isWinner && styles.voteBarWinner]} />
                    </View>
                    <Text style={styles.voteCount}>{voteCount} vote{voteCount !== 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>

              {/* Vote CTA or checkmark */}
              {!hasVoted && !isExpired ? (
                <View style={styles.voteCta}>
                  <Text style={styles.voteCtaText}>Vote</Text>
                </View>
              ) : isMyPick ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
              ) : null}
            </TouchableOpacity>
          );
        })}

        {/* Tap to view restaurant */}
        {restaurants.length > 0 && (
          <Text style={styles.tapHint}>Tap a restaurant to vote · Tap its name to view details</Text>
        )}
      </ScrollView>

      {/* View winner CTA */}
      {winnerIds.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.viewWinnerButton}
            onPress={() => navigation.navigate('RestaurantDetail', { id: winnerIds[0] })}
            activeOpacity={0.8}
          >
            <Ionicons name="trophy" size={18} color={colors.text} />
            <Text style={styles.viewWinnerText}>View Leading Pick</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.body,
    color: colors.textMuted,
  },
  backLink: {
    fontSize: typography.body,
    color: colors.accent,
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.headline,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: 2,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.cardBg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  expiredText: {
    fontSize: typography.subhead,
    color: colors.textMuted,
  },
  winnerBanner: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  winnerBannerText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.accent,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 100,
  },
  pollTitle: {
    fontSize: typography.title3,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardWinner: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  cardMyPick: {
    borderColor: colors.accent,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankBadgeWinner: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  rankText: {
    fontSize: typography.subhead,
    fontWeight: '700',
    color: colors.text,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
  },
  thumbFallback: {
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  infoTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flex: 1,
    fontSize: typography.callout,
    fontWeight: '600',
    color: colors.text,
  },
  myPickBadge: {
    backgroundColor: 'rgba(164, 30, 34, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  myPickText: {
    fontSize: typography.caption2,
    color: colors.accent,
    fontWeight: '600',
  },
  address: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
  voteBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  voteBarBg: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.cardBgElevated,
    overflow: 'hidden',
  },
  voteBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  voteBarWinner: {
    backgroundColor: '#FFD700',
  },
  voteCount: {
    fontSize: typography.caption2,
    color: colors.textSecondary,
    width: 48,
    textAlign: 'right',
  },
  voteCta: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  voteCtaText: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.text,
  },
  tapHint: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewWinnerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#B8860B',
    paddingVertical: 16,
    borderRadius: radius.md,
  },
  viewWinnerText: {
    fontSize: typography.headline,
    fontWeight: '700',
    color: colors.text,
  },
});
