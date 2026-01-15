import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/colors';
import { submitRating, getUserRating, POINT_VALUES } from '../lib/rewards';

interface RatingSubmitProps {
  restaurantId: string;
  onRatingSubmitted?: (rating: number, pointsEarned: number) => void;
}

export default function RatingSubmit({
  restaurantId,
  onRatingSubmitted,
}: RatingSubmitProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);

  useEffect(() => {
    loadExistingRating();
  }, [restaurantId]);

  const loadExistingRating = async () => {
    try {
      setIsLoading(true);
      const response = await getUserRating(restaurantId);
      if (response.has_rated && response.rating) {
        setExistingRating(response.rating);
        setSelectedRating(response.rating);
      }
    } catch (error) {
      console.log('Error loading rating:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStarPress = async (rating: number) => {
    if (isSubmitting) return;

    setSelectedRating(rating);
    setIsSubmitting(true);
    setShowSuccess(false);

    try {
      const response = await submitRating(restaurantId, rating);

      if (response.success) {
        setExistingRating(rating);
        setShowSuccess(true);

        if (response.is_first_rating && response.points_earned > 0) {
          setPointsEarned(response.points_earned);
        }

        onRatingSubmitted?.(rating, response.points_earned);

        // Hide success message after 3 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setPointsEarned(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      // Revert to existing rating on error
      setSelectedRating(existingRating);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isSelected = selectedRating !== null && i <= selectedRating;
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => handleStarPress(i)}
          disabled={isSubmitting}
          style={styles.starButton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isSelected ? 'star' : 'star-outline'}
            size={32}
            color={isSelected ? '#FFB800' : colors.textMuted}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {existingRating ? 'Your Rating' : 'Rate this restaurant'}
        </Text>
        {!existingRating && (
          <Text style={styles.pointsHint}>
            +{POINT_VALUES.review} pts
          </Text>
        )}
      </View>

      <View style={styles.starsContainer}>
        {renderStars()}
        {isSubmitting && (
          <ActivityIndicator
            size="small"
            color={colors.accent}
            style={styles.submittingIndicator}
          />
        )}
      </View>

      {showSuccess && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.successText}>
            {pointsEarned
              ? `Rating saved! +${pointsEarned} points`
              : 'Rating updated!'}
          </Text>
        </View>
      )}

      {selectedRating && !showSuccess && (
        <Text style={styles.ratingLabel}>
          {getRatingLabel(selectedRating)}
        </Text>
      )}
    </View>
  );
}

function getRatingLabel(rating: number): string {
  switch (rating) {
    case 1:
      return 'Poor';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Very Good';
    case 5:
      return 'Excellent';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  pointsHint: {
    fontSize: 14,
    color: colors.gold,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  starButton: {
    paddingHorizontal: spacing.xs,
  },
  submittingIndicator: {
    marginLeft: spacing.sm,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  successText: {
    fontSize: 14,
    color: colors.success,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  ratingLabel: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
