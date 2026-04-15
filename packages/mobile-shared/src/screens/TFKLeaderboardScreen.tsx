import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { getSupabase } from '../config/theme';
import { useAuth } from '../context/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface TriviaEntry {
  id: string;
  player_name: string;
  score: number;
  venue_name: string;
  nightly_date: string;
  is_winner: boolean;
  prize_description: string | null;
}

interface PrizeLocation {
  id: string;
  title: string;
  restaurant_id: string;
  restaurant_name: string;
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

function RankBadge({ rank }: { rank: number }) {
  const styles = useStyles();
  const bg = RANK_COLORS[rank];
  return (
    <View style={[styles.rankBadge, bg ? { backgroundColor: bg } : null]}>
      <Text style={[styles.rankText, bg ? { color: '#000' } : null]}>#{rank}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}`;
}

function LeaderboardRow({ entry, rank }: { entry: TriviaEntry; rank: number }) {
  const styles = useStyles();
  const colors = getColors();

  return (
    <View style={styles.row}>
      <RankBadge rank={rank} />
      <View style={styles.rowContent}>
        <Text style={styles.teamName} numberOfLines={1}>
          {entry.player_name}
        </Text>
        <Text style={styles.venueText} numberOfLines={1}>
          {entry.venue_name} · {formatDate(entry.nightly_date)}
        </Text>
      </View>
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{entry.score}</Text>
        {entry.is_winner && (
          <Ionicons name="trophy" size={16} color="#FFD700" />
        )}
      </View>
    </View>
  );
}

function ClaimPrizeModal({
  visible,
  onClose,
  onClaim,
  prizeLocations,
  isLoading,
}: {
  visible: boolean;
  onClose: () => void;
  onClaim: (locationId: string) => void;
  prizeLocations: PrizeLocation[];
  isLoading: boolean;
}) {
  const styles = useStyles();
  const colors = getColors();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const handleClaim = () => {
    if (!selectedLocation) {
      Alert.alert('Location Required', 'Please select where you want to redeem your prize.');
      return;
    }
    onClaim(selectedLocation);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Claim Your $25 Prize</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Select where you'd like to redeem your prize. Show the QR code to staff at your chosen location.
          </Text>

          <Text style={styles.modalLabel}>Choose redemption location:</Text>
          <View style={styles.locationList}>
            {prizeLocations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.locationButton,
                  selectedLocation === loc.id && styles.locationButtonActive,
                ]}
                onPress={() => setSelectedLocation(loc.id)}
              >
                <Ionicons
                  name={selectedLocation === loc.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedLocation === loc.id ? colors.accent : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.locationText,
                    selectedLocation === loc.id && styles.locationTextActive,
                  ]}
                >
                  {loc.restaurant_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.claimButton, isLoading && styles.claimButtonDisabled]}
            onPress={handleClaim}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text style={styles.claimButtonText}>Claim Prize</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function TFKLeaderboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const styles = useStyles();
  const colors = getColors();
  const { marketSlug } = useMarket();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showClaimModal, setShowClaimModal] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['tfk-leaderboard', marketSlug],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: market } = await supabase
        .from('markets')
        .select('id')
        .eq('slug', marketSlug)
        .single();

      if (!market) return [];

      const { data, error } = await supabase
        .from('trivia_leaderboard_entries')
        .select('*')
        .eq('market_id', market.id)
        .eq('is_active', true)
        .order('score', { ascending: false })
        .order('nightly_date', { ascending: false });

      if (error) {
        console.error('TFK leaderboard error:', error);
        return [];
      }

      return data as TriviaEntry[];
    },
    enabled: !!marketSlug,
  });

  const { data: prizeLocations = [] } = useQuery({
    queryKey: ['prize-locations', marketSlug],
    queryFn: async () => {
      const supabase = getSupabase();
      const { data: market } = await supabase
        .from('markets')
        .select('id')
        .eq('slug', marketSlug)
        .single();

      if (!market) return [];

      const { data, error } = await supabase
        .from('coupons')
        .select('id, title, restaurant_id, restaurant:restaurants!inner(name)')
        .eq('title', '$25 TasteLanc Prize')
        .eq('is_active', true);

      if (error) {
        console.error('Prize locations error:', error);
        return [];
      }

      return data.map((d: any) => ({
        id: d.id,
        title: d.title,
        restaurant_id: d.restaurant_id,
        restaurant_name: d.restaurant.name,
      })) as PrizeLocation[];
    },
    enabled: !!marketSlug,
  });

  const claimMutation = useMutation({
    mutationFn: async ({ locationId }: { locationId: string }) => {
      if (!user) {
        throw new Error('You must be logged in to claim prizes.');
      }

      // Find the selected coupon
      const selectedCoupon = prizeLocations.find((loc) => loc.id === locationId);
      if (!selectedCoupon) {
        throw new Error('Invalid prize location selected.');
      }

      // Create coupon claim
      const supabase = getSupabase();
      const { data: claim, error } = await supabase
        .from('coupon_claims')
        .insert({
          user_id: user.id,
          coupon_id: locationId,
          user_email: user.email || '',
          claimed_at: new Date().toISOString(),
        })
        .select('*, coupon:coupons!inner(*, restaurant:restaurants!inner(name))')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('You have already claimed a prize at this location.');
        }
        throw new Error(error.message);
      }

      return claim;
    },
    onSuccess: (claim: any) => {
      setShowClaimModal(false);
      queryClient.invalidateQueries({ queryKey: ['tfk-leaderboard'] });

      // Navigate to reward claim screen with QR code
      const restaurantName = claim.coupon?.restaurant?.name || 'Restaurant';
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

      navigation.navigate('RewardClaim', {
        claim_token: claim.id, // Using coupon_claim ID as token
        restaurant_name: restaurantName,
        reward_description: '$25 TasteLanc Prize',
        expires_at: expiresAt,
      });
    },
    onError: (error: Error) => {
      Alert.alert('Claim Failed', error.message);
    },
  });

  const handleClaimPress = useCallback(() => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You must be logged in to claim prizes. Would you like to sign in?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigation.navigate('Profile' as any) },
        ]
      );
      return;
    }
    setShowClaimModal(true);
  }, [user, navigation]);

  const handleClaim = (locationId: string) => {
    claimMutation.mutate({ locationId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TFK Trivia Leaderboard</Text>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleContainer}>
        <Ionicons name="trophy" size={20} color="#FFD700" />
        <Text style={styles.subtitle}>Restaurant Week Champions</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <LeaderboardRow entry={item} rank={index + 1} />}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="beer-outline" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No winners yet!</Text>
                <Text style={styles.emptySubtext}>
                  Play Thirsty for Knowledge trivia to be the first
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.xl }}
          />

          {entries.some((e) => e.is_winner) && (
            <View style={styles.claimSection}>
              <TouchableOpacity style={styles.claimCTA} onPress={handleClaimPress}>
                <Ionicons name="gift" size={20} color={colors.textOnAccent} />
                <Text style={styles.claimCTAText}>Claim Your $25 Prize</Text>
              </TouchableOpacity>
              <Text style={styles.claimNote}>
                One claim per user • Show QR code at participating restaurants
              </Text>
            </View>
          )}
        </>
      )}

      <ClaimPrizeModal
        visible={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaim={handleClaim}
        prizeLocations={prizeLocations}
        isLoading={claimMutation.isPending}
      />
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles(() => {
  const colors = getColors();
  return {
    container: {
      flex: 1,
      backgroundColor: colors.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    backBtn: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingBottom: spacing.md,
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBg,
    },
    rankBadge: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.cardBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    rowContent: {
      flex: 1,
      gap: 2,
    },
    teamName: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
    },
    venueText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    scoreContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    score: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.accent,
      minWidth: 30,
      textAlign: 'right',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
      gap: spacing.sm,
    },
    emptyText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
      marginTop: spacing.sm,
    },
    emptySubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    claimSection: {
      padding: spacing.md,
      gap: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.cardBg,
    },
    claimCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
    },
    claimCTAText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textOnAccent,
    },
    claimNote: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.primary,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    modalDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginTop: spacing.xs,
    },
    locationList: {
      gap: spacing.xs,
    },
    locationButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.cardBg,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    locationButtonActive: {
      backgroundColor: `${colors.accent}20`,
      borderWidth: 1,
      borderColor: colors.accent,
    },
    locationText: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },
    locationTextActive: {
      fontWeight: '600',
      color: colors.accent,
    },
    claimButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    claimButtonDisabled: {
      opacity: 0.5,
    },
    claimButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textOnAccent,
    },
  };
});
