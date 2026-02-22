/**
 * Squad Vote Screen
 *
 * The app picks 5 great spots for your crew — no typing required.
 * Suggestions are based on what's trending, has happy hour, and
 * what the community loves. Tap ↻ to swap any spot, then share
 * the poll and let your squad vote.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { colors, radius, spacing, typography } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SQUAD_INDIGO = '#6C63FF';
const SUGGESTION_COUNT = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

interface SuggestedRestaurant {
  id: string;
  name: string;
  neighborhood: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  categories: string[] | null;
  tag: string;
}

// ─── Suggestion algorithm ─────────────────────────────────────────────────────

async function loadSuggestions(
  marketId: string | null
): Promise<{ suggestions: SuggestedRestaurant[]; pool: SuggestedRestaurant[] }> {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Fetch up to 100 active restaurants
  let q = supabase
    .from('restaurants')
    .select('id, name, neighborhood, cover_image_url, logo_url, categories')
    .eq('is_active', true);
  if (marketId) q = q.eq('market_id', marketId);
  const { data: restaurants } = await q.limit(100);
  const all = (restaurants || []) as Array<SuggestedRestaurant & { score?: number }>;

  // 2. Get active happy-hour restaurant IDs
  const { data: happyHours } = await supabase
    .from('happy_hours')
    .select('restaurant_id')
    .eq('is_active', true);
  const happyHourIds = new Set(
    (happyHours || []).map((h: { restaurant_id: string }) => h.restaurant_id)
  );

  // 3. Get this month's community vote counts per restaurant
  const { data: votes } = await supabase
    .from('votes')
    .select('restaurant_id')
    .eq('month', currentMonth);
  const voteCounts: Record<string, number> = {};
  (votes || []).forEach((v: { restaurant_id: string }) => {
    voteCounts[v.restaurant_id] = (voteCounts[v.restaurant_id] || 0) + 1;
  });

  // 4. Score + tag each restaurant
  const scored = all.map((r) => {
    let tag = '🗺️ Lancaster Pick';
    let score = Math.random() * 2; // base randomness for variety

    if (happyHourIds.has(r.id)) {
      tag = '🍺 Happy Hour';
      score += 8;
    }
    const voteScore = voteCounts[r.id] || 0;
    if (voteScore > 0) {
      score += voteScore * 3;
      if (!happyHourIds.has(r.id)) tag = '🔥 Trending';
    }

    return { ...r, tag, score };
  });

  // 5. Sort by score, enforce category variety (max 2 per primary category)
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const picked: typeof scored = [];
  for (const c of scored) {
    if (picked.length >= SUGGESTION_COUNT) break;
    const primary = c.categories?.[0] || 'other';
    const count = picked.filter((p) => (p.categories?.[0] || 'other') === primary).length;
    if (count < 2) picked.push(c);
  }

  // Backfill to 5 if variety filter left gaps
  if (picked.length < SUGGESTION_COUNT) {
    for (const c of scored) {
      if (picked.length >= SUGGESTION_COUNT) break;
      if (!picked.some((p) => p.id === c.id)) picked.push(c);
    }
  }

  const pickedIds = new Set(picked.map((r) => r.id));
  const pool = scored.filter((r) => !pickedIds.has(r.id));

  const toSuggestion = (r: typeof scored[number]): SuggestedRestaurant => ({
    id: r.id,
    name: r.name,
    neighborhood: r.neighborhood,
    cover_image_url: r.cover_image_url,
    logo_url: r.logo_url,
    categories: r.categories,
    tag: r.tag,
  });

  return {
    suggestions: picked.map(toSuggestion),
    pool: pool.map(toSuggestion),
  };
}

// ─── SuggestionCard ───────────────────────────────────────────────────────────

function SuggestionCard({
  restaurant: r,
  index,
  onSwap,
}: {
  restaurant: SuggestedRestaurant;
  index: number;
  onSwap: () => void;
}) {
  const imageUri = r.cover_image_url || r.logo_url;

  return (
    <View style={styles.card}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImageFallback]}>
          <Ionicons name="restaurant" size={24} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.cardInfo}>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{index + 1}</Text>
        </View>
        <View style={styles.cardTextBlock}>
          <Text style={styles.cardName} numberOfLines={1}>{r.name}</Text>
          {r.neighborhood ? (
            <Text style={styles.cardNeighborhood} numberOfLines={1}>{r.neighborhood}</Text>
          ) : null}
          <View style={styles.tagChip}>
            <Text style={styles.tagText}>{r.tag}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.swapButton}
          onPress={onSwap}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="shuffle" size={18} color={SQUAD_INDIGO} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SquadBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userId } = useAuth();
  const { marketId } = useMarket();

  const [suggestions, setSuggestions] = useState<SuggestedRestaurant[]>([]);
  const [pool, setPool] = useState<SuggestedRestaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await loadSuggestions(marketId);
      setSuggestions(result.suggestions);
      setPool(result.pool);
    } catch {
      Alert.alert('Error', 'Could not load suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSwap = useCallback(
    (index: number) => {
      const current = suggestions[index];
      const currentPrimary = current.categories?.[0];

      // Prefer same-category alternatives, fall back to any pool item
      const sameCat = pool.filter((r) => r.categories?.[0] === currentPrimary);
      const alternatives = sameCat.length >= 3 ? sameCat.slice(0, 3) : pool.slice(0, 3);

      if (alternatives.length === 0) {
        Alert.alert('No more options', 'Tap the refresh button for a whole new set.');
        return;
      }

      Alert.alert(
        'Swap for…',
        '',
        [
          ...alternatives.map((a) => ({
            text: a.name,
            onPress: () => {
              const updated = [...suggestions];
              updated[index] = { ...a };
              setSuggestions(updated);
              // Return swapped-out restaurant to pool, remove replacement
              setPool((prev) => [current, ...prev.filter((r) => r.id !== a.id)]);
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    },
    [suggestions, pool]
  );

  const handleSendToSquad = useCallback(async () => {
    if (!userId) {
      Alert.alert('Sign in required', 'Create an account to start a squad poll.');
      return;
    }
    if (suggestions.length === 0) {
      Alert.alert('No spots yet', 'Tap the refresh button to load suggestions.');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('squad_polls')
        .insert({
          creator_id: userId,
          title: 'Where should we go?',
          restaurant_ids: suggestions.map((r) => r.id),
        })
        .select('id')
        .single();

      if (error || !data) throw error || new Error('Failed to create poll');

      const pollId = data.id;
      const shortCode = pollId.slice(0, 8).toUpperCase();

      const shareMsg =
        `🗳️ Squad Vote — Where should we eat tonight?\n\n` +
        suggestions.map((r, i) => `${i + 1}. ${r.name}`).join('\n') +
        `\n\nVote on TasteLanc! Code: ${shortCode}\n` +
        `https://apps.apple.com/app/tastelanc/id6755852717`;

      try {
        await Share.share({ message: shareMsg });
      } catch {
        // User dismissed share sheet — still navigate to results
      }

      navigation.replace('SquadVote', { pollId });
    } catch {
      Alert.alert('Error', 'Failed to create the poll. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [suggestions, userId, navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Squad Vote</Text>
          <Text style={styles.headerSubtitle}>We picked these for your crew</Text>
        </View>
        <TouchableOpacity
          onPress={load}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          disabled={isLoading}
        >
          <Ionicons
            name="refresh"
            size={22}
            color={isLoading ? colors.textSecondary : SQUAD_INDIGO}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SQUAD_INDIGO} />
          <Text style={styles.loadingText}>Finding the best spots…</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {suggestions.map((r, index) => (
            <SuggestionCard
              key={r.id}
              restaurant={r}
              index={index}
              onSwap={() => handleSwap(index)}
            />
          ))}

          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.hintText}>
              Tap ↻ to swap any spot. Hit refresh for a whole new set. Everyone in your squad gets
              one vote — the winner is revealed live.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* Footer CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (isCreating || isLoading || suggestions.length === 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendToSquad}
          activeOpacity={0.85}
          disabled={isCreating || isLoading || suggestions.length === 0}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="share-social" size={20} color={colors.text} />
          )}
          <Text style={styles.sendButtonText}>
            {isCreating ? 'Creating Poll…' : 'Send to Squad →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: typography.headline, fontWeight: '700', color: colors.text },
  headerSubtitle: { fontSize: typography.caption1, color: colors.textMuted, marginTop: 2 },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: { fontSize: typography.subhead, color: colors.textMuted },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },

  // Restaurant suggestion card
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImage: {
    width: 80,
    height: 80,
  },
  cardImageFallback: {
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  cardBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: SQUAD_INDIGO,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBadgeText: {
    fontSize: typography.caption1,
    fontWeight: '700',
    color: colors.text,
  },
  cardTextBlock: { flex: 1, gap: 2 },
  cardName: {
    fontSize: typography.callout,
    fontWeight: '600',
    color: colors.text,
  },
  cardNeighborhood: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
  tagChip: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(108, 99, 255, 0.15)',
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  tagText: {
    fontSize: typography.caption2,
    color: SQUAD_INDIGO,
    fontWeight: '600',
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  hint: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
    fontSize: typography.caption1,
    color: colors.textSecondary,
    lineHeight: 18,
  },

  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: SQUAD_INDIGO,
    paddingVertical: 16,
    borderRadius: radius.md,
    shadowColor: SQUAD_INDIGO,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: { opacity: 0.55 },
  sendButtonText: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
  },
});
