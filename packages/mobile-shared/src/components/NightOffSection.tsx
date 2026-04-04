import { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

const CARD_WIDTH = 130;
const CARD_HEIGHT = 200;
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
          activeOpacity={0.88}
        >
          <ImageBackground
            source={item.cover_image_url ? { uri: item.cover_image_url } : undefined}
            style={styles.imageBackground}
            imageStyle={styles.imageStyle}
          >
            {/* Dark placeholder when no image */}
            {!item.cover_image_url && (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="restaurant-outline" size={32} color={colors.textSecondary} />
              </View>
            )}

            {/* Gradient overlay — fades from transparent to dark at bottom */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.gradient}
            />

            {/* Bottom overlay: badge + name */}
            <View style={styles.overlay}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Mon & Tue</Text>
              </View>
              <Text style={styles.cardName} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
          </ImageBackground>
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
    height: CARD_HEIGHT,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  imageBackground: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'flex-end',
  },
  imageStyle: {
    borderRadius: radius.lg,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.cardBgElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
  },
  overlay: {
    padding: spacing.sm,
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 17,
  },
}));
