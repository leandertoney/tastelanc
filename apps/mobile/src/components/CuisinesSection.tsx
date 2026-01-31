import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ALL_CUISINES, CUISINE_LABELS, CuisineType } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants/colors';
import { CUISINE_IMAGES, CUISINE_COLORS, CUISINE_EMOJIS } from '../constants/cuisines';
import SectionHeader from './SectionHeader';
import Spacer from './Spacer';
import { useEmailGate } from '../hooks';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface CuisineItemProps {
  cuisine: CuisineType;
  onPress: () => void;
}

function CuisineItem({ cuisine, onPress }: CuisineItemProps) {
  const label = CUISINE_LABELS[cuisine];
  const imageUrl = CUISINE_IMAGES[cuisine];
  const color = CUISINE_COLORS[cuisine];
  const emoji = CUISINE_EMOJIS[cuisine];

  return (
    <TouchableOpacity style={styles.cuisineItem} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.imageContainer, !imageUrl && { backgroundColor: color }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
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
  const { requireEmailGate } = useEmailGate();

  const handleCuisinePress = (cuisine: CuisineType) => {
    navigation.navigate('CuisineDetail', { cuisine });
  };

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
