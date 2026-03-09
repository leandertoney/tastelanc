/**
 * VideoRecommendationFeed — displays a grid of video recommendation tiles
 * for a restaurant. First tile is always a CTA to add a recommendation.
 */
import { View, Text, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getColors } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { radius } from '../constants/spacing';
import { useAuth } from '../hooks/useAuth';
import { useSignUpModal } from '../context/SignUpModalContext';
import {
  useRestaurantRecommendations,
  useUserLikedRecommendations,
  useToggleRecommendationLike,
  useFlagRecommendation,
  useDeleteRecommendation,
} from '../hooks/useVideoRecommendations';
import { recordView } from '../lib/videoRecommendations';
import VideoRecommendationCard from './VideoRecommendationCard';
import type { RestaurantInfo } from './VideoRecommendationCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface VideoRecommendationFeedProps {
  restaurantId: string;
  restaurantName: string;
  restaurantLogoUrl?: string | null;
  restaurantCoverUrl?: string | null;
}

export default function VideoRecommendationFeed({
  restaurantId,
  restaurantName,
  restaurantLogoUrl,
  restaurantCoverUrl,
}: VideoRecommendationFeedProps) {
  const colors = getColors();
  const styles = useStyles();
  const { userId } = useAuth();
  const navigation = useNavigation<any>();
  const { showSignUpModal } = useSignUpModal();

  const { data: recommendations = [], isLoading } = useRestaurantRecommendations(restaurantId);
  const { data: likedIds = [] } = useUserLikedRecommendations();

  const toggleLike = useToggleRecommendationLike();
  const flagMutation = useFlagRecommendation();
  const deleteMutation = useDeleteRecommendation();

  const restaurant: RestaurantInfo = {
    name: restaurantName,
    logo_url: restaurantLogoUrl,
    cover_image_url: restaurantCoverUrl,
  };

  const handleAddRecommendation = () => {
    if (!userId) {
      showSignUpModal();
      return;
    }
    navigation.navigate('VideoRecommendCapture', {
      restaurantId,
      restaurantName,
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {recommendations.length > 0 && (
        <Text style={styles.countText}>
          {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
        </Text>
      )}
      <View style={styles.grid}>
        {/* CTA tile — always first */}
        <TouchableOpacity
          style={styles.ctaTile}
          onPress={handleAddRecommendation}
          activeOpacity={0.8}
        >
          <View style={styles.ctaIconCircle}>
            <Ionicons name="add" size={32} color={colors.accent} />
          </View>
          <Text style={styles.ctaTitle}>Add a{'\n'}Recommendation</Text>
          <Text style={styles.ctaSubtext}>Share what you love</Text>
        </TouchableOpacity>

        {/* Video tiles */}
        {recommendations.map((rec) => (
          <View key={rec.id} style={styles.gridItem}>
            <VideoRecommendationCard
              recommendation={rec}
              restaurant={restaurant}
              isLiked={likedIds.includes(rec.id)}
              isOwnContent={rec.user_id === userId}
              onLike={(id) => toggleLike.mutate(id)}
              onFlag={(id) => flagMutation.mutate(id)}
              onDelete={(id) => deleteMutation.mutate(id)}
              onViewCounted={(id) => recordView(id)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center' as const,
  },
  countText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500' as const,
  },
  gridItem: {
    width: GRID_CARD_WIDTH,
  },
  ctaTile: {
    width: GRID_CARD_WIDTH,
    aspectRatio: 9 / 16,
    backgroundColor: colors.cardBg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.accent,
    borderStyle: 'dashed' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  ctaIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.accent}15`,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 10,
  },
  ctaTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  ctaSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center' as const,
  },
}));
