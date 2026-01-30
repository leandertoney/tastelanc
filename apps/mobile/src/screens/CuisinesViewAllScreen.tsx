import { useState, useCallback, useMemo } from 'react';
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
import SearchBar from '../components/SearchBar';

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
            source={{ uri: imageUrl, cache: 'reload' }}
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
  const [searchQuery, setSearchQuery] = useState('');

  const { data: featuredRestaurants } = useQuery({
    queryKey: ['cuisineFeaturedRestaurants'],
    queryFn: getCuisineFeaturedRestaurants,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter cuisines by search query
  const filteredCuisines = useMemo(() => {
    if (!searchQuery.trim()) return ALL_CUISINES;
    const query = searchQuery.toLowerCase();
    return ALL_CUISINES.filter((cuisine) =>
      CUISINE_LABELS[cuisine].toLowerCase().includes(query) ||
      cuisine.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
        data={filteredCuisines}
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
            <View style={styles.searchContainer}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search cuisines..."
              />
            </View>
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
  searchContainer: {
    marginTop: spacing.sm,
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
