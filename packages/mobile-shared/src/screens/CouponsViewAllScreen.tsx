import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing } from '../constants/spacing';
import { getAllCoupons, CouponWithRestaurant, formatDiscount } from '../lib/coupons';
import { queryKeys } from '../lib/queryKeys';
import SpotifyStyleListItem from '../components/SpotifyStyleListItem';
import SearchBar from '../components/SearchBar';
import { trackImpression } from '../lib/impressions';
import { useMarket } from '../context/MarketContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function formatTimeWindow(startTime: string | null, endTime: string | null): string {
  if (!startTime || !endTime) return 'All Day';
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const suffix = h >= 12 ? 'pm' : 'am';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return minutes === '00' ? `${displayHour}${suffix}` : `${displayHour}:${minutes}${suffix}`;
  };
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

function formatDays(days: string[]): string {
  if (!days || days.length === 0) return 'Every Day';
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Mon-Fri';
  if (days.length === 2 && days.includes('saturday') && days.includes('sunday')) return 'Weekends';
  return days.map((d) => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
}

export default function CouponsViewAllScreen() {
  const styles = useStyles();
  const colors = getColors();
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: coupons = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.coupons.list(marketId),
    queryFn: () => getAllCoupons(marketId),
    staleTime: 5 * 60 * 1000,
  });

  const filteredCoupons = useMemo(() => {
    if (!searchQuery.trim()) return coupons;

    const query = searchQuery.toLowerCase();
    return coupons.filter((c) =>
      c.restaurant.name.toLowerCase().includes(query) ||
      c.title.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query))
    );
  }, [coupons, searchQuery]);

  const handlePress = useCallback(
    (restaurantId: string) => {
      navigation.navigate('RestaurantDetail', { id: restaurantId });
    },
    [navigation]
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as CouponWithRestaurant;
      if (item?.restaurant?.id) {
        trackImpression(item.restaurant.id, 'coupons_view_all', token.index ?? 0);
      }
    }
  }).current;

  const renderItem = ({ item }: { item: CouponWithRestaurant }) => {
    const discountText = formatDiscount(item);

    return (
      <SpotifyStyleListItem
        imageUrl={item.image_url || item.restaurant.cover_image_url}
        title={item.restaurant.name}
        accentText={discountText}
        subtitle={`${item.title} · ${formatTimeWindow(item.start_time, item.end_time)} · ${formatDays(item.days_of_week)}`}
        onPress={() => handlePress(item.restaurant.id)}
        fallbackIcon="ticket"
      />
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search coupons or restaurants..."
        />
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>All Coupons</Text>
        <Text style={styles.resultCount}>
          {filteredCoupons.length} {filteredCoupons.length === 1 ? 'coupon' : 'coupons'}
        </Text>
      </View>

      <FlatList
        data={filteredCoupons}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Coupons Available</Text>
            <Text style={styles.emptyText}>
              Check back soon for new deals!
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  resultCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.md,
    paddingTop: 0,
    gap: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
}));
