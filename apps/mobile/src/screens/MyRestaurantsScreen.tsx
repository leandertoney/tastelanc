/**
 * MyRestaurantsScreen — Personal visit history timeline
 * Shows every restaurant the user has checked in to, sorted by most recent
 */
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colors, spacing, radius, typography } from '../constants/colors';
import type { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface VisitRecord {
  id: string;
  restaurantId: string;
  restaurantName: string;
  logoUrl: string | null;
  neighborhood: string | null;
  pointsEarned: number;
  visitedAt: string;
  isFirstVisit: boolean;
}

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diffDays > 365 ? 'numeric' : undefined });
}

function useVisitHistory() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: ['visitHistory', userId],
    queryFn: async (): Promise<VisitRecord[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('checkins')
        .select(`
          id,
          restaurant_id,
          restaurant_name,
          points_earned,
          created_at,
          restaurants (
            logo_url,
            neighborhood
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      // Track which restaurant IDs we've seen to mark first visits
      const seenIds = new Set<string>();
      const records: VisitRecord[] = [];

      // Iterate in reverse (oldest first) to find first visits
      const reversed = [...data].reverse();
      const firstVisitIds = new Set<string>();
      reversed.forEach((r: any) => {
        if (!firstVisitIds.has(r.restaurant_id)) {
          firstVisitIds.add(r.restaurant_id);
        }
      });

      // But only mark the EARLIEST checkin for each restaurant as "first visit"
      const earliestByRestaurant = new Map<string, string>();
      reversed.forEach((r: any) => {
        if (!earliestByRestaurant.has(r.restaurant_id)) {
          earliestByRestaurant.set(r.restaurant_id, r.id);
        }
      });

      data.forEach((r: any) => {
        records.push({
          id: r.id,
          restaurantId: r.restaurant_id,
          restaurantName: r.restaurant_name,
          logoUrl: r.restaurants?.logo_url || null,
          neighborhood: r.restaurants?.neighborhood || null,
          pointsEarned: r.points_earned || 10,
          visitedAt: r.created_at,
          isFirstVisit: earliestByRestaurant.get(r.restaurant_id) === r.id,
        });
      });

      return records;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

function VisitRow({ item, onPress }: { item: VisitRecord; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        {item.logoUrl ? (
          <Image source={{ uri: item.logoUrl }} style={styles.logo} />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder]}>
            <Ionicons name="restaurant" size={20} color={colors.textSecondary} />
          </View>
        )}
        {item.isFirstVisit && (
          <View style={styles.firstBadge}>
            <Text style={styles.firstBadgeText}>1st</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.restaurantName}</Text>
        {item.neighborhood && (
          <Text style={styles.neighborhood} numberOfLines={1}>{item.neighborhood}</Text>
        )}
      </View>

      {/* Right side */}
      <View style={styles.right}>
        <Text style={styles.time}>{timeLabel(item.visitedAt)}</Text>
        <Text style={styles.points}>+{item.pointsEarned} pts</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MyRestaurantsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: visits = [], isLoading } = useVisitHistory();

  const uniqueCount = new Set(visits.map((v) => v.restaurantId)).size;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>My Restaurants</Text>
          {uniqueCount > 0 && (
            <Text style={styles.headerSubtitle}>
              {uniqueCount} restaurant{uniqueCount !== 1 ? 's' : ''} visited
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <VisitRow
            item={item}
            onPress={() => navigation.navigate('RestaurantDetail', { id: item.restaurantId })}
          />
        )}
        contentContainerStyle={visits.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>Your Lancaster story starts here</Text>
              <Text style={styles.emptySubtitle}>
                Visit restaurants and check in to build your personal dining history.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

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
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    gap: spacing.sm,
  },
  logoContainer: {
    position: 'relative',
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
  },
  logoPlaceholder: {
    backgroundColor: colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  firstBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.gold,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  firstBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: typography.subhead,
    fontWeight: '600',
    color: colors.text,
  },
  neighborhood: {
    fontSize: typography.caption1,
    color: colors.textMuted,
    marginTop: 2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  time: {
    fontSize: typography.caption1,
    color: colors.textSecondary,
  },
  points: {
    fontSize: typography.caption1,
    color: colors.success,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.md + 52 + spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.headline,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.subhead,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
