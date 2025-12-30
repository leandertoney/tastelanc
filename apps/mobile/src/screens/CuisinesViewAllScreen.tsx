import { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { ALL_CUISINES, CUISINE_LABELS, CuisineType, Restaurant } from '../types/database';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../constants/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Fallback colors for cuisine category circles (used when no restaurant image)
const CUISINE_COLORS: Record<CuisineType, string> = {
  american_contemporary: '#4A90A4',
  italian: '#E74C3C',
  mediterranean: '#27AE60',
  asian: '#F39C12',
  latin: '#E67E22',
  seafood: '#3498DB',
  steakhouse: '#8B4513',
  pub_fare: '#D4A574',
};

// Fallback emoji icons for each cuisine type (used when no restaurant image)
const CUISINE_EMOJIS: Record<CuisineType, string> = {
  american_contemporary: '🍽️',
  italian: '🍝',
  mediterranean: '🥗',
  asian: '🍜',
  latin: '🌮',
  seafood: '🦞',
  steakhouse: '🥩',
  pub_fare: '🍔',
};

type CuisineFeaturedRestaurant = Pick<Restaurant, 'id' | 'name' | 'cover_image_url' | 'cuisine'>;

// Fetch one featured restaurant per cuisine
// NOTE: Disabled until 'cuisine' column is added to restaurants table
async function getCuisineFeaturedRestaurants(): Promise<Record<CuisineType, CuisineFeaturedRestaurant | null>> {
  const results: Partial<Record<CuisineType, CuisineFeaturedRestaurant | null>> = {};

  // TODO: Re-enable once cuisine column exists in database
  // For now, return empty results to use emoji fallbacks
  ALL_CUISINES.forEach((c) => {
    results[c] = null;
  });
  return results as Record<CuisineType, CuisineFeaturedRestaurant | null>;

  /* Uncomment when cuisine column is added:
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, cover_image_url, cuisine')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null)
    .not('cuisine', 'is', null);

  if (error) {
    console.error('Error fetching cuisine restaurants:', error);
    ALL_CUISINES.forEach((c) => {
      results[c] = null;
    });
    return results as Record<CuisineType, CuisineFeaturedRestaurant | null>;
  }

  ALL_CUISINES.forEach((cuisine) => {
    const restaurant = data?.find((r) => r.cuisine === cuisine);
    results[cuisine] = restaurant || null;
  });

  return results as Record<CuisineType, CuisineFeaturedRestaurant | null>;
  */
}

interface CuisineCardProps {
  cuisine: CuisineType;
  imageUrl?: string | null;
  onPress: () => void;
}

function CuisineCard({ cuisine, imageUrl, onPress }: CuisineCardProps) {
  const label = CUISINE_LABELS[cuisine];
  const color = CUISINE_COLORS[cuisine];
  const emoji = CUISINE_EMOJIS[cuisine];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.imageContainer, !imageUrl && { backgroundColor: color }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cuisineImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.emoji}>{emoji}</Text>
        )}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function CuisinesViewAllScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: featuredRestaurants } = useQuery({
    queryKey: ['cuisineFeaturedRestaurants'],
    queryFn: getCuisineFeaturedRestaurants,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handlePress = useCallback(
    (cuisine: CuisineType) => {
      navigation.navigate('CuisineDetail', { cuisine });
    },
    [navigation]
  );

  const renderItem = ({ item }: { item: CuisineType }) => (
    <CuisineCard
      cuisine={item}
      imageUrl={featuredRestaurants?.[item]?.cover_image_url}
      onPress={() => handlePress(item)}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={ALL_CUISINES}
        renderItem={renderItem}
        keyExtractor={(item) => item}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Browse by Cuisine</Text>
            <Text style={styles.headerSubtitle}>
              Explore restaurants by food type
            </Text>
          </View>
        }
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
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.md,
  },
  row: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cuisineImage: {
    width: 100,
    height: 100,
  },
  emoji: {
    fontSize: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
});
