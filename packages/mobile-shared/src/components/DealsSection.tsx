import { useRef } from 'react';
import { View, FlatList, ViewToken } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import DealTicketCard, { TICKET_CARD_WIDTH } from './DealTicketCard';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { getAllCoupons, formatDiscount, type CouponWithRestaurant } from '../lib/coupons';
import type { RootStackParamList } from '../navigation/types';
import { createLazyStyles } from '../utils/lazyStyles';
import { spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { trackClick } from '../lib/analytics';
import { trackImpression } from '../lib/impressions';
import { queryKeys } from '../lib/queryKeys';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DealsSection() {
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const styles = useStyles();

  const { data: coupons = [], isLoading, isFetching } = useQuery({
    queryKey: queryKeys.coupons.list(marketId),
    queryFn: () => getAllCoupons(marketId),
    staleTime: 5 * 60 * 1000,
  });

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    for (const token of viewableItems) {
      const item = token.item as CouponWithRestaurant;
      if (item?.restaurant?.id) {
        trackImpression(item.restaurant.id, 'deals_section', token.index ?? 0);
      }
    }
  }).current;

  const handlePress = (restaurantId: string) => {
    trackClick('deal', restaurantId);
    navigation.navigate('RestaurantDetail', { id: restaurantId, initialTab: 'coupons' });
  };

  if (coupons.length === 0) {
    if (isLoading || isFetching) return <View />;
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Deals"
        actionText="View All"
        onActionPress={() => navigation.navigate('CouponsViewAll')}
      />
      <Spacer size="sm" />

      {coupons.length === 1 ? (
        <View style={styles.listContent}>
          <DealTicketCard
            title={coupons[0].title}
            description={coupons[0].description}
            restaurantName={coupons[0].restaurant.name}
            discountLabel={formatDiscount(coupons[0])}
            imageUrl={coupons[0].image_url || coupons[0].restaurant.cover_image_url || undefined}
            onPress={() => handlePress(coupons[0].restaurant.id)}
            fullWidth
          />
        </View>
      ) : (
        <FlatList
          data={coupons}
          renderItem={({ item }) => (
            <DealTicketCard
              title={item.title}
              description={item.description}
              restaurantName={item.restaurant.name}
              discountLabel={formatDiscount(item)}
              imageUrl={item.image_url || item.restaurant.cover_image_url || undefined}
              onPress={() => handlePress(item.restaurant.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          snapToInterval={TICKET_CARD_WIDTH + spacing.md}
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
        />
      )}
    </View>
  );
}

const useStyles = createLazyStyles(() => ({
  container: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
  },
}));
