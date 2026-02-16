import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SpotlightSpecial } from '../types/database';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import SpotlightCard from './SpotlightCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const AUTO_SCROLL_INTERVAL = 4000;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Mock data for when specials array is empty
const MOCK_SPECIALS: SpotlightSpecial[] = [
  {
    title: '$2 Off All Drafts',
    restaurantName: 'Your Restaurant Here',
    timeWindow: '5–7 PM',
    isPremium: true,
  },
  {
    title: 'Half-Price Appetizers Tonight',
    restaurantName: 'Your Restaurant Here',
    timeWindow: '4–6 PM',
    isPremium: false,
  },
  {
    title: 'Late-Night Happy Hour — $8 Cocktails',
    restaurantName: 'Your Restaurant Here',
    timeWindow: '9–11 PM',
    isPremium: true,
  },
];

interface SpotlightCarouselProps {
  specials?: SpotlightSpecial[];
}

export default function SpotlightCarousel({ specials = [] }: SpotlightCarouselProps) {
  const navigation = useNavigation<NavigationProp>();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  // Use mock data if specials array is empty
  const displaySpecials = specials.length > 0 ? specials : MOCK_SPECIALS;

  const handleCardPress = useCallback(
    (special: SpotlightSpecial) => {
      // Only navigate if there's a valid restaurantId
      if (special.restaurantId) {
        navigation.navigate('RestaurantDetail', { id: special.restaurantId });
      }
    },
    [navigation]
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      if (flatListRef.current && displaySpecials.length > 0) {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
        });
      }
    },
    [displaySpecials.length]
  );

  // Auto-scroll logic
  useEffect(() => {
    const startAutoScroll = () => {
      autoScrollTimer.current = setInterval(() => {
        if (!isUserScrolling && displaySpecials.length > 1) {
          const nextIndex = (currentIndex + 1) % displaySpecials.length;
          setCurrentIndex(nextIndex);
          scrollToIndex(nextIndex);
        }
      }, AUTO_SCROLL_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [currentIndex, isUserScrolling, displaySpecials.length, scrollToIndex]);

  const handleScrollBegin = () => {
    setIsUserScrolling(true);
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIsUserScrolling(false);
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / CARD_WIDTH);
    setCurrentIndex(Math.max(0, Math.min(newIndex, displaySpecials.length - 1)));
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / CARD_WIDTH);
    setCurrentIndex(Math.max(0, Math.min(newIndex, displaySpecials.length - 1)));
  };

  const renderItem = ({ item }: { item: SpotlightSpecial }) => (
    <SpotlightCard
      title={item.title}
      restaurantName={item.restaurantName}
      timeWindow={item.timeWindow}
      imageUrl={item.imageUrl}
      isPremium={item.isPremium}
      onPress={item.restaurantId ? () => handleCardPress(item) : undefined}
    />
  );

  const getItemLayout = (_: unknown, index: number) => ({
    length: CARD_WIDTH,
    offset: CARD_WIDTH * index,
    index,
  });

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={displaySpecials}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || `mock-${index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.listContent}
      />

      {/* Pagination Dots */}
      {displaySpecials.length > 1 && (
        <View style={styles.paginationContainer}>
          {displaySpecials.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  listContent: {
    paddingRight: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  dotInactive: {
    backgroundColor: colors.textSecondary,
  },
});
