import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_WIDTH = 120;
const THUMBNAIL_HEIGHT = 90;

interface PhotosCarouselProps {
  photos: string[];
  restaurantName?: string;
}

export default function PhotosCarousel({ photos, restaurantName }: PhotosCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxRef = useRef<FlatList>(null);

  const openLightbox = useCallback((index: number) => {
    setSelectedIndex(index);
    setLightboxIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    setSelectedIndex(null);
  }, []);

  const handleLightboxScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / SCREEN_WIDTH);
      setLightboxIndex(Math.max(0, Math.min(newIndex, photos.length - 1)));
    },
    [photos.length]
  );

  const goToPrevious = useCallback(() => {
    if (lightboxIndex > 0) {
      const newIndex = lightboxIndex - 1;
      setLightboxIndex(newIndex);
      lightboxRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [lightboxIndex]);

  const goToNext = useCallback(() => {
    if (lightboxIndex < photos.length - 1) {
      const newIndex = lightboxIndex + 1;
      setLightboxIndex(newIndex);
      lightboxRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [lightboxIndex, photos.length]);

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={32} color={colors.textSecondary} />
        <Text style={styles.emptyText}>No additional photos</Text>
      </View>
    );
  }

  const renderThumbnail = ({ item, index }: { item: string; index: number }) => (
    <TouchableOpacity
      style={styles.thumbnailContainer}
      onPress={() => openLightbox(index)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item, cache: 'reload' }} style={styles.thumbnail} resizeMode="cover" />
      {index === 0 && photos.length > 1 && (
        <View style={styles.countBadge}>
          <Ionicons name="images" size={12} color="#FFF" />
          <Text style={styles.countText}>{photos.length}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLightboxImage = ({ item }: { item: string }) => (
    <View style={styles.lightboxImageContainer}>
      <Image
        source={{ uri: item, cache: 'reload' }}
        style={styles.lightboxImage}
        resizeMode="contain"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={photos}
        renderItem={renderThumbnail}
        keyExtractor={(item, index) => `photo-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />

      {/* Lightbox Modal */}
      <Modal
        visible={selectedIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <View style={styles.lightboxOverlay}>
          {/* Header */}
          <View style={styles.lightboxHeader}>
            <TouchableOpacity onPress={closeLightbox} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            {restaurantName && (
              <Text style={styles.lightboxTitle} numberOfLines={1}>
                {restaurantName}
              </Text>
            )}
            <Text style={styles.lightboxCounter}>
              {lightboxIndex + 1} / {photos.length}
            </Text>
          </View>

          {/* Image Gallery */}
          <FlatList
            ref={lightboxRef}
            data={photos}
            renderItem={renderLightboxImage}
            keyExtractor={(item, index) => `lightbox-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleLightboxScroll}
            initialScrollIndex={selectedIndex || 0}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
          />

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              {lightboxIndex > 0 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonLeft]}
                  onPress={goToPrevious}
                >
                  <Ionicons name="chevron-back" size={32} color="#FFF" />
                </TouchableOpacity>
              )}
              {lightboxIndex < photos.length - 1 && (
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonRight]}
                  onPress={goToNext}
                >
                  <Ionicons name="chevron-forward" size={32} color="#FFF" />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Pagination Dots */}
          {photos.length > 1 && photos.length <= 10 && (
            <View style={styles.paginationContainer}>
              {photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === lightboxIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  listContent: {
    paddingHorizontal: 4,
  },
  thumbnailContainer: {
    marginHorizontal: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: 8,
  },
  countBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  countText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.textMuted,
  },

  // Lightbox styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  lightboxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  lightboxTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  lightboxCounter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    minWidth: 50,
    textAlign: 'right',
  },
  lightboxImageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#FFF',
    width: 20,
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
});
