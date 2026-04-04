import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { getSupabase } from '../config/theme';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius, spacing } from '../constants/spacing';
import { useMarket } from '../context/MarketContext';
import { trackImpression } from '../lib/impressions';
import type { Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CARD_WIDTH = 140;
const IMAGE_HEIGHT = 96;
const MAX_ITEMS = 8;
const MIN_ITEMS = 3;

async function getNightOffRestaurants(marketId: string | null): Promise<Restaurant[]> {
  const supabase = getSupabase();

  // Get restaurant IDs open on Mondays OR Tuesdays
  const { data: hoursData, error: hoursError } = await supabase
    .from('restaurant_hours')
    .select('restaurant_id')
    .in('day_of_week', ['monday', 'tuesday'])
    .eq('is_closed', false)
    .not('open_time', 'is', null);

  if (hoursError) {
    console.warn('NightOffSection hours query failed:', hoursError.message);
    return [];
  }
  if (!hoursData || hoursData.length === 0) {
    console.log('NightOffSection: no Mon/Tue hours found');
    return [];
  }

  // Deduplicate restaurant IDs
  const openIds = [...new Set(hoursData.map((h) => h.restaurant_id))];
  console.log('NightOffSection: found', openIds.length, 'Mon/Tue restaurants');

  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .in('id', openIds)
    .limit(MAX_ITEMS);

  if (marketId) {
    query = query.eq('market_id', marketId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('NightOffSection restaurants query failed:', error.message);
    return [];
  }

  console.log('NightOffSection: returning', (data || []).length, 'restaurants');
  return (data || []) as Restaurant[];
}

export default function NightOffSection() {
  const navigation = useNavigation<NavigationProp>();
  const { marketId } = useMarket();
  const colors = getColors();
  const styles = useStyles();

  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ['nightOff', marketId],
    queryFn: () => getNightOffRestaurants(marketId),
    staleTime: 5 * 60 * 1000,
  });

  const capped = restaurants.slice(0, MAX_ITEMS);

  const handlePress = useCallback(
    (id: string) => {
      navigation.navigate('RestaurantDetail', { id });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Restaurant; index: number }) => {
      trackImpression(item.id, 'night_off', index);

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handlePress(item.id)}
          activeOpacity={0.85}
        >
          <View style={styles.imageContainer}>
            {item.cover_image_url ? (
              <Image
                source={{ uri: item.cover_image_url, cache: 'reload' }}
                style={styles.image}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="restaurant-outline" size={24} color={colors.textSecondary} />
              </View>
            )}
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardName} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, colors, handlePress]
  );

  const keyExtractor = useCallback((item: Restaurant) => item.id, []);

  if (isLoading) return null;
  if (capped.length < MIN_ITEMS) return null;

  return (
    <View style={styles.container}>
      <SectionHeader title="Open Monday & Tuesday" />
      <Spacer size="sm" />

      <FlatList
        data={capped}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={3}
      />
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    marginBottom: spacing.md,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.cardBgElevated,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBgElevated,
  },
  cardContent: {
    padding: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 17,
  },
}));
