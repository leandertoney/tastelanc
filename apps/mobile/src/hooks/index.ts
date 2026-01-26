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

// Voting hooks
export {
  useVoteBalance,
  useSubmitVote,
  useUserVotes,
  useCurrentMonthVotes,
  useHasVotedInCategory,
  useLeaderboard,
  useCurrentWinners,
} from './useVotes';

// Location hooks
export {
  useUserLocation,
  calculateDistance,
  formatDistance,
  LANCASTER_CENTER,
} from './useUserLocation';

// Radar visit hooks (for personalization)
export {
  useRadarVisits,
  useVisitedRestaurants,
  useVisitCounts,
  useRecentVisits,
  useRecordVisit,
} from './useRadarVisits';

// Restaurant insights hooks (analytics dashboard)
export {
  useRestaurantInsights,
  useRefreshInsights,
} from './useRestaurantInsights';

// Social proof hooks
export {
  usePlatformSocialProof,
  useRestaurantSocialProof,
  useTrendingRestaurants,
  useRecordCheckinForSocialProof,
} from './useSocialProof';

// Rewards hooks
export {
  useRewardsBalance,
  useRewardsHistory,
  useRewardsHistoryFlat,
  useEarnPoints,
  usePremiumMultiplier,
  useInvalidateRewards,
} from './useRewards';

// Voting eligibility hooks (dwell time)
export {
  useVotingEligibility,
  useBatchVotingEligibility,
} from './useVotingEligibility';

// Promo card hooks
export { usePromoCard } from './usePromoCard';

// Blog hooks
export { useBlogPosts, useLatestBlogPosts } from './useBlogPosts';

// Itinerary hooks
export {
  useItineraries,
  useItinerary,
  useSaveItinerary,
  useDeleteItinerary,
} from './useItineraries';
