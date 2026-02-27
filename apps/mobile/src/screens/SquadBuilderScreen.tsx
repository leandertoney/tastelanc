/**
 * Squad Builder Screen
 *
 * Pick 2–5 restaurants, create a poll, share the code with your group.
 * Friends open the app → SquadVoteScreen → vote → see the winner.
 */

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types/database';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useMarket } from '../context/MarketContext';
import { colors, radius, spacing, typography } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MIN_CHOICES = 2;
const MAX_CHOICES = 5;

// ─── Restaurant search hook ───────────────────────────────────────────────────

function useRestaurantSearch(query: string, marketId: string | null) {
  return useQuery({
    queryKey: ['squad', 'search', query, marketId],
    queryFn: async (): Promise<Restaurant[]> => {
      if (query.trim().length < 2) return [];
      let q = supabase
        .from('restaurants')
        .select('id, name, address, cover_image_url, logo_url, cuisine, categories')
        .eq('is_active', true)
        .ilike('name', `%${query.trim()}%`)
        .limit(20);
      if (marketId) q = q.eq('market_id', marketId);
      const { data } = await q;
      return (data || []) as unknown as Restaurant[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 30 * 1000,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SquadBuilderScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { userId } = useAuth();
  const { marketId } = useMarket();

  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<Restaurant[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: searchResults = [], isFetching } = useRestaurantSearch(searchQuery, marketId);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggle = useCallback((restaurant: Restaurant) => {
    setSelected(prev => {
      if (prev.some(r => r.id === restaurant.id)) {
        return prev.filter(r => r.id !== restaurant.id);
      }
      if (prev.length >= MAX_CHOICES) {
        Alert.alert('Max reached', `You can pick up to ${MAX_CHOICES} options.`);
        return prev;
      }
      return [...prev, restaurant];
    });
  }, []);

  const handleCreate = useCallback(async () => {
    if (selected.length < MIN_CHOICES) {
      Alert.alert('Pick more', `Add at least ${MIN_CHOICES} spots to start a poll.`);
      return;
    }
    if (!userId) {
      Alert.alert('Sign in required', 'Create an account to start a squad poll.');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('squad_polls')
        .insert({
          creator_id: userId,
          title: 'Where should we go?',
          restaurant_ids: selected.map(r => r.id),
        })
        .select('id')
        .single();

      if (error || !data) throw error || new Error('Failed to create poll');

      const pollId = data.id;
      const shortCode = pollId.slice(0, 8).toUpperCase();

      // Share the poll
      const shareMsg =
        `🍴 Squad Poll — Where should we go tonight?\n\n` +
        selected.map((r, i) => `${i + 1}. ${r.name}`).join('\n') +
        `\n\nVote on TasteLanc! Code: ${shortCode}\n` +
        `https://apps.apple.com/app/tastelanc/id6755852717`;

      try {
        await Share.share({ message: shareMsg });
      } catch {
        // User dismissed — that's fine, still navigate
      }

      // Navigate to the vote screen so the creator can see live results
      navigation.replace('SquadVote', { pollId });
    } catch (err) {
      Alert.alert('Error', 'Failed to create the poll. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [selected, userId, navigation]);

  // ── Render ────────────────────────────────────────────────────────────────

  const isSelected = (id: string) => selected.some(r => r.id === id);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Squad Picker</Text>
          <Text style={styles.headerSubtitle}>Pick spots, let your crew vote</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Selected chips */}
        {selected.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Your picks ({selected.length}/{MAX_CHOICES})
            </Text>
            <View style={styles.selectedList}>
              {selected.map((r, i) => (
                <View key={r.id} style={styles.selectedChip}>
                  <Text style={styles.selectedChipNumber}>{i + 1}</Text>
                  {r.cover_image_url || r.logo_url ? (
                    <Image source={{ uri: r.cover_image_url || r.logo_url || undefined }} style={styles.chipThumb} />
                  ) : (
                    <View style={[styles.chipThumb, styles.chipThumbFallback]}>
                      <Ionicons name="restaurant" size={14} color={colors.textMuted} />
                    </View>
                  )}
                  <Text style={styles.selectedChipName} numberOfLines={1}>{r.name}</Text>
                  <TouchableOpacity onPress={() => handleToggle(r)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Search restaurants</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Type a restaurant name..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {isFetching && <ActivityIndicator size="small" color={colors.textMuted} />}
          </View>

          {/* Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsList}>
              {searchResults.map(r => {
                const sel = isSelected(r.id);
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.resultRow, sel && styles.resultRowSelected]}
                    onPress={() => handleToggle(r)}
                    activeOpacity={0.7}
                  >
                    {r.cover_image_url || r.logo_url ? (
                      <Image source={{ uri: r.cover_image_url || r.logo_url || undefined }} style={styles.resultThumb} />
                    ) : (
                      <View style={[styles.resultThumb, styles.resultThumbFallback]}>
                        <Ionicons name="restaurant" size={16} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultName} numberOfLines={1}>{r.name}</Text>
                      {r.address && (
                        <Text style={styles.resultAddress} numberOfLines={1}>{r.address}</Text>
                      )}
                    </View>
                    <View style={[styles.checkCircle, sel && styles.checkCircleSelected]}>
                      {sel && <Ionicons name="checkmark" size={14} color={colors.text} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !isFetching && (
            <Text style={styles.noResults}>No restaurants found for "{searchQuery}"</Text>
          )}
        </View>

        {/* Hint */}
        <View style={styles.hint}>
          <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.hintText}>
            Pick {MIN_CHOICES}–{MAX_CHOICES} spots, then share the poll link with your group. Everyone votes, you all see the winner.
          </Text>
        </View>
      </ScrollView>

      {/* Create poll CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (selected.length < MIN_CHOICES || isCreating) && styles.createButtonDisabled,
          ]}
          onPress={handleCreate}
          activeOpacity={0.8}
          disabled={selected.length < MIN_CHOICES || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="share-social" size={20} color={colors.text} />
          )}
          <Text style={styles.createButtonText}>
            {isCreating
              ? 'Creating Poll...'
              : selected.length < MIN_CHOICES
              ? `Pick at least ${MIN_CHOICES} spots`
              : `Send Poll to Squad (${selected.length} spots)`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
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
  section: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Selected chips
  selectedList: {
    gap: spacing.sm,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  selectedChipNumber: {
    fontSize: typography.subhead,
    fontWeight: '700',
    color: colors.accent,
    width: 18,
    textAlign: 'center',
  },
  chipThumb: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
  },
  chipThumbFallback: {
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedChipName: {
    flex: 1,
    fontSize: typography.callout,
    fontWeight: '600',
    color: colors.text,
  },
  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    color: colors.text,
    paddingVertical: 4,
  },
  resultsList: {
    gap: spacing.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultRowSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(164, 30, 34, 0.08)',
  },
  resultThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  resultThumbFallback: {
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    fontSize: typography.callout,
    fontWeight: '600',
    color: colors.text,
  },
  resultAddress: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  noResults: {
    fontSize: typography.subhead,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  // Hint
  hint: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
    fontSize: typography.caption1,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  // Footer
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonDisabled: {
    opacity: 0.55,
  },
  createButtonText: {
    fontSize: typography.headline,
    fontWeight: '600',
    color: colors.text,
  },
});
