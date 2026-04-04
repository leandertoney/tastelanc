/**
 * TrendingRecommendationsSection — horizontal scroll of trending video
 * recommendations on the HomeScreen. Shows community-created content
 * to drive engagement and discovery.
 */
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors, getBrand } from '../config/theme';
import { createLazyStyles } from '../utils/lazyStyles';
import { useMarket } from '../context/MarketContext';
import { useAuth } from '../hooks/useAuth';
import {
  useTrendingRecommendations,
  useUserLikedRecommendations,
  useToggleRecommendationLike,
  useFlagRecommendation,
  useDeleteRecommendation,
} from '../hooks/useVideoRecommendations';
import { recordView } from '../lib/videoRecommendations';
import VideoRecommendationCard from './VideoRecommendationCard';
import type { RestaurantInfo } from './VideoRecommendationCard';

export default function TrendingRecommendationsSection() {
  const colors = getColors();
  const brand = getBrand();
  const styles = useStyles();
  const { marketId } = useMarket();
  const { userId } = useAuth();

  const { data: recommendations = [] } = useTrendingRecommendations(marketId ?? undefined);
  const { data: likedIds = [] } = useUserLikedRecommendations();

  const toggleLike = useToggleRecommendationLike();
  const flagMutation = useFlagRecommendation();
  const deleteMutation = useDeleteRecommendation();

  // Hide section if no recommendations
  if (recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <Text style={styles.title}>Trending on {brand.appName}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>See what people are recommending</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map((rec) => {
          const restaurant: RestaurantInfo = {
            name: rec.restaurants?.name || 'Restaurant',
            logo_url: null,
            cover_image_url: null,
          };

          return (
            <View key={rec.id} style={styles.cardWrapper}>
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
              {/* Restaurant name label */}
              <Text style={styles.restaurantName} numberOfLines={1}>
                {rec.restaurants?.name || ''}
              </Text>
            </View>
          );
        })}
        {/* End-of-scroll nudge */}
        <View style={styles.nudgeCard}>
          <Ionicons name="videocam-outline" size={24} color={colors.accent} />
          <Text style={styles.nudgeText}>
            Visit any restaurant to{'\n'}leave your own recommendation
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createLazyStyles((colors) => ({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  cardWrapper: {
    width: 160,
  },
  restaurantName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textMuted,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  nudgeCard: {
    width: 120,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 8,
    gap: 8,
  },
  nudgeText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 16,
  },
}));
