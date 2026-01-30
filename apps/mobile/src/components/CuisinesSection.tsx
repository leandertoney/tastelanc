import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ALL_CUISINES, CUISINE_LABELS, CuisineType, Restaurant } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { colors, spacing } from '../constants/colors';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { useEmailGate } from '../hooks';

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
  cafe: '#6F4E37',
  breakfast: '#FFB347',
  brunch: '#FF6B6B',
  desserts: '#DDA0DD',
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
  cafe: '☕',
  breakfast: '🍳',
  brunch: '🥂',
  desserts: '🍰',
};

// These cuisines are stored in the categories array, not the cuisine column
const CATEGORY_BASED_CUISINES: CuisineType[] = ['breakfast', 'brunch', 'desserts'];

type CuisineFeaturedRestaurant = Pick<Restaurant, 'id' | 'name' | 'cover_image_url' | 'cuisine'> & { categories?: string[] };

// Fetch one featured restaurant per cuisine
async function getCuisineFeaturedRestaurants(): Promise<Record<CuisineType, CuisineFeaturedRestaurant | null>> {
  const results: Partial<Record<CuisineType, CuisineFeaturedRestaurant | null>> = {};

  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, cover_image_url, cuisine, categories')
    .eq('is_active', true)
    .not('cover_image_url', 'is', null);

  if (error) {
    console.error('Error fetching cuisine restaurants:', error);
    ALL_CUISINES.forEach((c) => {
      results[c] = null;
    });
    return results as Record<CuisineType, CuisineFeaturedRestaurant | null>;
  }

  ALL_CUISINES.forEach((cuisine) => {
    let restaurant: CuisineFeaturedRestaurant | undefined;

    if (CATEGORY_BASED_CUISINES.includes(cuisine)) {
      // For breakfast, brunch, desserts - check categories array
      restaurant = data?.find((r) => r.categories?.includes(cuisine));
    } else {
      // For traditional cuisines - check cuisine column
      restaurant = data?.find((r) => r.cuisine === cuisine);
    }

    results[cuisine] = restaurant || null;
  });

  return results as Record<CuisineType, CuisineFeaturedRestaurant | null>;
}

interface CuisineItemProps {
  cuisine: CuisineType;
  imageUrl?: string | null;
  onPress: () => void;
}

function CuisineItem({ cuisine, imageUrl, onPress }: CuisineItemProps) {
  const label = CUISINE_LABELS[cuisine];
  const color = CUISINE_COLORS[cuisine];
  const emoji = CUISINE_EMOJIS[cuisine];

  return (
    <TouchableOpacity style={styles.cuisineItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.imageContainer, !imageUrl && { backgroundColor: color }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl, cache: 'reload' }}
            style={styles.cuisineImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.placeholderEmoji}>{emoji}</Text>
        )}
      </View>
      <Text style={styles.cuisineLabel} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function CuisinesSection() {
  const navigation = useNavigation<NavigationProp>();

  const { data: featuredRestaurants } = useQuery({
    queryKey: ['cuisineFeaturedRestaurants'],
    queryFn: getCuisineFeaturedRestaurants,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const handleCuisinePress = (cuisine: CuisineType) => {
    navigation.navigate('CuisineDetail', { cuisine });
  };

  const { requireEmailGate } = useEmailGate();

  const handleViewAll = () => {
    requireEmailGate(() => navigation.navigate('CuisinesViewAll'));
  };

  return (
    <View>
      <SectionHeader
        title="Cuisines"
        actionText="View all"
        onActionPress={handleViewAll}
      />
      <Spacer size="sm" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ALL_CUISINES.map((cuisine) => (
          <CuisineItem
            key={cuisine}
            cuisine={cuisine}
            imageUrl={featuredRestaurants?.[cuisine]?.cover_image_url}
            onPress={() => handleCuisinePress(cuisine)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const ITEM_SIZE = 80;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  cuisineItem: {
    alignItems: 'center',
    width: ITEM_SIZE,
  },
  imageContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBg,
  },
  cuisineImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },
  placeholderEmoji: {
    fontSize: 32,
  },
  cuisineLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
});
