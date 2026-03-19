/**
 * WishlistScreen — Bucket list of restaurants the user wants to visit
 */
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getColors, getSupabase } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing, radius, typography } from '../constants/spacing';
import { useAuth } from '../hooks/useAuth';
import { useToggleWishlist } from '../hooks/useWishlist';
import { useMarket } from '../context/MarketContext';
import type { RootStackParamList } from '../navigation/types';
import type { Restaurant } from '../types/database';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function useWishlistRestaurants() {
  const { userId } = useAuth();
  const { marketId } = useMarket();
  const supabase = getSupabase();

  return useQuery({
    queryKey: ['wishlistRestaurants', userId, marketId],
    queryFn: async (): Promise<Restaurant[]> => {
      if (!userId) return [];

      let query = supabase
        .from('wishlist')
        .select(`
          restaurant_id,
          created_at,
          restaurants!inner (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (marketId) {
        query = query.eq('restaurants.market_id', marketId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      if (!data) return [];
      return data
        .map((row: any) => row.restaurants)
        .filter(Boolean) as unknown as Restaurant[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

function WishlistCard({ restaurant }: { restaurant: Restaurant }) {
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const { mutate: toggleWishlist } = useToggleWishlist();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('RestaurantDetail', { id: restaurant.id })}
      activeOpacity={0.8}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {restaurant.logo_url ? (
          <Image source={{ uri: restaurant.logo_url }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="restaurant" size={28} color={colors.textSecondary} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        {restaurant.neighborhood && (
          <Text style={styles.neighborhood} numberOfLines={1}>{restaurant.neighborhood}</Text>
        )}
        {restaurant.address && (
          <Text style={styles.address} numberOfLines={1}>{restaurant.address}</Text>
        )}
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => toggleWishlist(restaurant.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="bookmark" size={20} color={colors.accent} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function WishlistScreen() {
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const { data: restaurants = [], isLoading, isError, refetch, isRefetching } = useWishlistRestaurants();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Bucket List</Text>
          {restaurants.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {restaurants.length} place{restaurants.length !== 1 ? 's' : ''} to try
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WishlistCard restaurant={item} />}
        contentContainerStyle={restaurants.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          isLoading ? null : isError ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Couldn't Load Bucket List</Text>
              <Text style={styles.emptySubtitle}>Check your connection and pull to refresh.</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetch()} activeOpacity={0.8}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Nothing on your bucket list yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the bookmark icon on any restaurant to save it for later.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.title3,
    fontWeight: '700' as const,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 32,
    paddingTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
  },
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  imageContainer: {
    borderRadius: radius.md,
    overflow: 'hidden' as const,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
  },
  imagePlaceholder: {
    backgroundColor: colors.cardBg,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: typography.subhead,
    fontWeight: '600' as const,
    color: colors.text,
  },
  neighborhood: {
    fontSize: typography.caption1,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  address: {
    fontSize: typography.caption1,
    color: colors.textMuted,
  },
  removeButton: {
    padding: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.md + 56 + spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.headline,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.subhead,
    color: colors.textMuted,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.accent,
    borderRadius: 24,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.textOnAccent,
  },
}));
