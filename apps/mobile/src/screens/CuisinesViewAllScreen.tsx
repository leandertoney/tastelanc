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
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { ALL_CUISINES, CUISINE_LABELS, CuisineType } from '../types/database';
import { colors, radius, spacing } from '../constants/colors';
import { CUISINE_IMAGES, CUISINE_COLORS, CUISINE_EMOJIS } from '../constants/cuisines';
import SearchBar from '../components/SearchBar';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CuisineCardProps {
  cuisine: CuisineType;
  onPress: () => void;
}

function CuisineCard({ cuisine, onPress }: CuisineCardProps) {
  const label = CUISINE_LABELS[cuisine];
  const imageUrl = CUISINE_IMAGES[cuisine];
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
  const [searchQuery, setSearchQuery] = useState('');

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
