import { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing } from '../constants/colors';
import { formatCuisineName } from '../lib/formatters';
import { formatDistance } from '../hooks/useUserLocation';
import RatingStars from './RatingStars';
import type { RestaurantWithTier } from '../types/database';
import { useState } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const PHOTO_HEIGHT = 180;

interface MapRestaurantCardProps {
  restaurant: RestaurantWithTier & { distance: number };
  isFavorite: boolean;
  onFavoritePress: () => void;
  onPress: () => void;
  onClose: () => void;
}

export default function MapRestaurantCard({
  restaurant,
  isFavorite,
  onFavoritePress,
  onPress,
  onClose,
}: MapRestaurantCardProps) {
  const translateY = useSharedValue(300);
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = restaurant.photos?.length
    ? restaurant.photos
    : restaurant.cover_image_url
      ? [restaurant.cover_image_url]
      : [];

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(300, { duration: 200 }, () => {
      runOnJS(onClose)();
    });
  }, [onClose]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = e.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / CARD_WIDTH);
      setPhotoIndex(Math.max(0, Math.min(index, photos.length - 1)));
    },
    [photos.length]
  );

  const rating = restaurant.tastelancrating ?? restaurant.average_rating;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.card}>
        {/* Photo area */}
        <View style={styles.photoContainer}>
          {photos.length > 0 ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              keyExtractor={(_, i) => `photo-${i}`}
              getItemLayout={(_, index) => ({
                length: CARD_WIDTH,
                offset: CARD_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item, cache: 'reload' }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              )}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="restaurant-outline" size={40} color={colors.textSecondary} />
            </View>
          )}

          {/* Pagination dots */}
          {photos.length > 1 && (
            <View style={styles.pagination}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === photoIndex ? styles.dotActive : styles.dotInactive]}
                />
              ))}
            </View>
          )}

          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>

          {/* Favorite button */}
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={(e) => {
              e.stopPropagation();
              onFavoritePress();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? colors.accent : '#FFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Info section */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
            {restaurant.is_verified && (
              <Text> <Ionicons name="checkmark-circle" size={14} color={colors.accent} /></Text>
            )}
          </Text>

          <View style={styles.metaRow}>
            {rating != null && rating > 0 && (
              <RatingStars rating={rating} size="small" showCount={false} />
            )}
            {restaurant.price_range && (
              <Text style={styles.metaText}>{restaurant.price_range}</Text>
            )}
            {restaurant.cuisine && (
              <Text style={styles.metaText}>{formatCuisineName(restaurant.cuisine)}</Text>
            )}
            <Text style={styles.metaDistance}>{formatDistance(restaurant.distance)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  photoContainer: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT,
    backgroundColor: colors.cardBgElevated,
    position: 'relative',
  },
  photo: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT,
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 16,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: spacing.md,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  metaDistance: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
});
