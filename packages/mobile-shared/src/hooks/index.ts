// Auth hooks
export { useAuth } from './useAuth';

// Profile hooks
export {
  useProfile,
  useWebPremiumStatus,
  useUpdatePremiumStatus,
  useInvalidateProfile,
} from './useProfile';

// Restaurant hooks
export {
  useRestaurants,
  useRestaurant,
  useRestaurantSearch,
  usePrefetchRestaurant,
} from './useRestaurants';

// Restaurant detail hooks
export {
  useRestaurantHours,
  useHappyHours,
  useSpecials,
  useEvents,
  useRestaurantAllData,
} from './useRestaurantDetail';

// Favorites hooks
export { useFavorites, useIsFavorite, useToggleFavorite } from './useFavorites';
export { useAuthAwareFavorite } from './useAuthAwareFavorite';

// Email gate hooks
export { useEmailGate } from './useEmailGate';

// Location hooks
export {
  useUserLocation,
  calculateDistance,
  formatDistance,
} from './useUserLocation';

// Radar visit hooks
export {
  useRadarVisits,
  useVisitedRestaurants,
  useVisitCounts,
  useRecentVisits,
  useRecordVisit,
} from './useRadarVisits';

// Restaurant insights hooks
export {
  useRestaurantInsights,
  useRefreshInsights,
} from './useRestaurantInsights';

// Social proof hooks
export {
  usePlatformSocialProof,
  usePersonalStats,
  useRestaurantSocialProof,
  useTrendingRestaurants,
  useRecordCheckinForSocialProof,
} from './useSocialProof';

// Wishlist / bucket list
export {
  useWishlist,
  useIsWishlisted,
  useToggleWishlist,
} from './useWishlist';

// Rewards hooks
export {
  useRewardsBalance,
  useRewardsHistory,
  useRewardsHistoryFlat,
  useEarnPoints,
  usePremiumMultiplier,
  useInvalidateRewards,
} from './useRewards';

// Promo card hooks
export { usePromoCard } from './usePromoCard';

// Ad hooks
export { useActiveAds } from './useAds';

// Move tab personalization algorithm signals
export { usePersonalizedFeed } from './usePersonalizedFeed';
export type { PersonalizedFeedSignals } from './usePersonalizedFeed';

// Blog hooks
export { useBlogPosts, useLatestBlogPosts } from './useBlogPosts';

// Itinerary hooks
export {
  useItineraries,
  useItinerary,
  useSaveItinerary,
  useDeleteItinerary,
} from './useItineraries';

// Open status hooks
export {
  useOpenStatuses,
  useIsOpen,
  getCurrentDay,
} from './useOpenStatus';

// Notification hooks
export { useNotifications } from './useNotifications';

// Video recommendation hooks
export {
  useRestaurantRecommendations,
  useUserRecommendations,
  useTrendingRecommendations,
  useUserLikedRecommendations,
  useToggleRecommendationLike,
  useFlagRecommendation,
  useDeleteRecommendation,
  useReviewerStats,
} from './useVideoRecommendations';

// Restaurant Week hooks
export { useRestaurantWeekIds } from './useRestaurantWeekIds';

// Coffee & Chocolate Trail hooks
export { useCoffeeChocolateTrailIds } from './useCoffeeChocolateTrailIds';

// Sales hooks
export { useSalesRole } from './useSalesRole';
export { useSalesInbox } from './useSalesInbox';
export { useSalesLeads } from './useSalesLeads';
export { useEmailThread } from './useEmailThread';
