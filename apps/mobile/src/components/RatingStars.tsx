import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

export default function RatingStars({
  rating,
  reviewCount,
  size = 'medium',
  showCount = true,
}: RatingStarsProps) {
  const starSize = size === 'small' ? 14 : size === 'large' ? 22 : 18;
  const fontSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={starSize} color="#FFB800" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={starSize} color="#FFB800" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={starSize} color="#FFB800" />
        );
      }
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>{renderStars()}</View>
      {showCount && (
        <Text style={[styles.ratingText, { fontSize }]}>
          {rating.toFixed(1)}
          {reviewCount !== undefined && (
            <Text style={styles.reviewCount}> ({reviewCount})</Text>
          )}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    marginRight: 6,
  },
  ratingText: {
    fontWeight: '600',
    color: colors.text,
  },
  reviewCount: {
    fontWeight: '400',
    color: colors.textMuted,
  },
});
