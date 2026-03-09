// Types
export type {
  AppConfig,
  AppBrand,
  AppAssets,
  ColorTokens,
  BrandPalette,
} from './types/config';

// Constants (identical across all market apps)
export { spacing, typography, radius } from './constants/spacing';
export type { Spacing, Typography, Radius } from './constants/spacing';

// Animation constants
export { stagger, duration, spring, reveal, easing, pulse, transforms, animationConfigs } from './constants/animations';

// Theme singleton
export { initTheme, getColors, getBrand, getAssets, getSupabase, isThemeInitialized } from './config/theme';

// React Context
export { AppConfigProvider, useAppConfig, useColors, useBrand, useAssets } from './config/context';

// Lazy styles
export { createLazyStyles } from './utils/lazyStyles';

// Database types
export type {
  RestaurantCategory,
  CuisineType,
  EventType,
  DayOfWeek,
  PremiumTier,
  Tier,
  Restaurant,
  FeaturedAd,
  RestaurantWithTier,
  RestaurantHours,
  Event,
  HappyHour,
  HappyHourItem,
  Special,
  RestaurantWithDetails,
  SpotlightSpecial,
  DietaryFlag,
  MenuItem,
  MenuSection,
  Menu,
  BlogPost,
  PremiumSource,
  Profile,
  CaptionTag,
  VideoRecommendation,
  VideoRecommendationWithUser,
  RecommendationLike,
  ReviewerStats,
} from './types/database';

export {
  CUISINE_LABELS as DB_CUISINE_LABELS,
  ALL_CUISINES,
  CAPTION_TAG_LABELS,
  ALL_CAPTION_TAGS,
} from './types/database';

// Onboarding types
export type { UserType, OnboardingData } from './types/onboarding';
export {
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_DATA_KEY,
  FREQUENCY_OPTIONS,
  DISCOVERY_OPTIONS,
  BUDGET_OPTIONS,
  ENTERTAINMENT_OPTIONS,
  FOOD_OPTIONS,
  FOOD_PREFERENCE_TO_CUISINE,
  EVENT_OPTIONS,
} from './types/onboarding';

// Itinerary types
export type {
  TimeSlot,
  ItineraryItemType,
  Itinerary,
  ItineraryItem,
  ItineraryWithItems,
  ItineraryItemWithReason,
  ItineraryMood,
} from './types/itinerary';
export { TIME_SLOT_CONFIG, ALL_TIME_SLOTS, ITINERARY_MOODS } from './types/itinerary';

// Query keys
export { queryKeys } from './lib/queryKeys';

// Lib utilities
export {
  CATEGORY_LABELS,
  CUISINE_LABELS,
  FEATURE_LABELS,
  FEATURE_ICONS,
  formatCategoryName,
  formatCuisineName,
  formatFeatureName,
  getFeatureIconName,
  getVibeEmoji,
  getBestForEmoji,
  formatTagLabel,
  getNoiseIcon,
  formatNoiseLevel,
  formatTime,
} from './lib/formatters';

export type { ListItemType, ListItem } from './lib/listUtils';
export { injectPromoIntoList, isPromoItem, isRegularItem } from './lib/listUtils';

export type { CarouselItemType, CarouselItem } from './lib/carouselUtils';
export { injectAdsIntoCarousel } from './lib/carouselUtils';

export {
  TIER_WEIGHTS,
  getEpochSeed,
  seededShuffle,
  getTierName,
  isPaidTier,
  paidFairRotate,
  basicFairRotate,
  tieredFairRotate,
  filterPaidOnly,
  filterBasicOnly,
  eliteFirstStableSort,
  getTierWeight,
} from './lib/fairRotation';

// Analytics
export { trackScreenView, trackClick } from './lib/analytics';

// Review prompts
export type { ReviewTrigger } from './lib/reviewPrompts';
export {
  getUserSentiment,
  setUserSentiment,
  incrementSessionCount,
  getSessionCount,
  markReviewPrompted,
  shouldPromptReview,
  requestReviewIfEligible,
  resetReviewTracking,
} from './lib/reviewPrompts';

// Contexts
export { AuthProvider, useAuth } from './context/AuthContext';
export type { Market } from './context/MarketContext';
export { MarketProvider, useMarket } from './context/MarketContext';
export type { SignUpModalOptions, SignUpModalContextType } from './context/SignUpModalContext';
export { SignUpModalContext, useSignUpModal } from './context/SignUpModalContext';
export { NavigationActionsProvider, useNavigationActions } from './context/NavigationActionsContext';
export type { NavigationActions } from './context/NavigationActionsContext';
export { OnboardingProvider, useOnboarding } from './context/OnboardingContext';

// Utils
export { pointInPolygon } from './utils/pointInPolygon';

// Data
export { NEIGHBORHOOD_BOUNDARIES } from './data/neighborhoodBoundaries';
export type { NeighborhoodBoundary } from './data/neighborhoodBoundaries';

// Components
export { default as Spacer } from './components/Spacer';
export { default as OpenStatusBadge } from './components/OpenStatusBadge';
export { default as CategoryChip } from './components/CategoryChip';
export { default as TagChip } from './components/TagChip';
export { default as RatingStars } from './components/RatingStars';
export { default as PremiumBadge } from './components/PremiumBadge';
export { default as TrendingBadge } from './components/TrendingBadge';
export type { BadgeType } from './components/TrendingBadge';
export { default as DateHeader } from './components/DateHeader';
export { default as SectionHeader } from './components/SectionHeader';
export { default as SectionCard } from './components/SectionCard';
export { default as SearchBar } from './components/SearchBar';
export { default as SignInNudge } from './components/SignInNudge';
export { default as BlogPostCard, BLOG_CARD_WIDTH } from './components/BlogPostCard';
export { default as EventCard, EVENT_CARD_WIDTH, EVENT_CARD_HEIGHT } from './components/EventCard';
export { default as RestaurantCard } from './components/RestaurantCard';
export { default as CompactRestaurantCard } from './components/CompactRestaurantCard';
export { default as FeaturedCard, CARD_WIDTH as FEATURED_CARD_WIDTH, CARD_HEIGHT as FEATURED_CARD_HEIGHT } from './components/FeaturedCard';
export { default as FeaturedAdCard, ShimmerSweep, Particle, GlowBorder, SponsoredBadge, PARTICLES } from './components/FeaturedAdCard';
export { default as SpotlightCard } from './components/SpotlightCard';
export { default as EntertainmentCard, ENTERTAINMENT_CARD_SIZE } from './components/EntertainmentCard';
export { default as EntertainmentListItem } from './components/EntertainmentListItem';
export type { EventWithRestaurant } from './components/EntertainmentListItem';
export { default as MapRestaurantCard } from './components/MapRestaurantCard';
export { default as SpotifyStyleListItem } from './components/SpotifyStyleListItem';
export { default as EventFlyerCard } from './components/EventFlyerCard';
export { default as SquadPickerCard } from './components/SquadPickerCard';
export { default as PartnerCTACard } from './components/PartnerCTACard';
export type { ContactCategory } from './components/PartnerCTACard';
export { default as PlanYourDayCard } from './components/PlanYourDayCard';
export { default as LockedFeatureCard } from './components/LockedFeatureCard';
export { default as TierLockedEmptyState } from './components/TierLockedEmptyState';
export type { FeatureType } from './components/TierLockedEmptyState';
export { default as SignUpModal } from './components/SignUpModal';
export { default as EmailGateModal, EMAIL_GATE_STORAGE_KEY } from './components/EmailGateModal';
export { default as PremiumUpgradeModal } from './components/PremiumUpgradeModal';
export { default as CheckInModal } from './components/CheckInModal';
export { default as RatingSubmit } from './components/RatingSubmit';
export { default as SantaStumbleModal } from './components/SantaStumbleModal';
export type { SantaStumbleData, SantaStumbleTheme, SantaBar, SantaPickup } from './components/SantaStumbleModal';
export { default as PartnerContactModal } from './components/PartnerContactModal';
export type { ContactCategory as PartnerContactCategory } from './components/PartnerContactModal';
export { default as FeatureFilterModal } from './components/FeatureFilterModal';
export { default as EntertainmentFilterModal } from './components/EntertainmentFilterModal';
export { default as ErrorBoundary, withScreenErrorBoundary, withSectionErrorBoundary } from './components/ErrorBoundary';
export { default as TabBar } from './components/TabBar';
export type { Tab } from './components/TabBar';
export { default as RestaurantMap } from './components/RestaurantMap';
export { default as MapPreview } from './components/MapPreview';
export { default as PromoCard } from './components/PromoCard';
export { default as ProfileStatsRow } from './components/ProfileStatsRow';
export { default as RecentActivityFeed } from './components/RecentActivityFeed';
export { default as ItineraryTimeline } from './components/ItineraryTimeline';
export { default as ItineraryTimeSlotCard } from './components/ItineraryTimeSlotCard';

// Video recommendation components
export { default as VideoRecommendationCard } from './components/VideoRecommendationCard';
export { default as VideoRecommendationFeed } from './components/VideoRecommendationFeed';

// Video recommendation utilities
export {
  uploadRecommendationVideo,
  uploadRecommendationThumbnail,
  createRecommendation,
  recordView,
  toggleLike as toggleRecommendationLike,
  flagRecommendation,
  deleteRecommendation,
  MAX_DURATION_SECONDS as RECOMMENDATION_MAX_DURATION,
  MAX_CAPTION_LENGTH as RECOMMENDATION_MAX_CAPTION_LENGTH,
} from './lib/videoRecommendations';

// Onboarding components
export { ContinueButton, MultiSelectGrid } from './components/Onboarding';

// Navigation types
export type { OnboardingStackParamList } from './navigation/types';
