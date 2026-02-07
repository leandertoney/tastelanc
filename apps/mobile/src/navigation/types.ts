import type { NavigatorScreenParams } from '@react-navigation/native';
import type { RestaurantCategory, CuisineType } from '../types/database';
import type { VoteCategory } from '../types/voting';
import type { ApiEvent } from '../lib/events';

// Onboarding Stack param list
export type OnboardingStackParamList = {
  // Phase 1: Welcome, Problem & Solution
  OnboardingSlides: undefined;
  OnboardingProblems: undefined;
  OnboardingSolution: undefined;
  // Feature Discovery
  OnboardingHappyHours: undefined;
  OnboardingEvents: undefined;
  OnboardingSpecials: undefined;
  // Phase 2: Personal Questions
  OnboardingUserType: undefined;
  OnboardingName: undefined;
  OnboardingDiningHabits: undefined;
  OnboardingEventSeeking: undefined;
  // Phase 3: Preferences
  OnboardingBudget: undefined;
  OnboardingEntertainment: undefined;
  OnboardingFood: undefined;
  // Phase 4: Summary & Conversion
  OnboardingPremium: undefined;
  OnboardingRosieAsk: undefined;
  OnboardingVoting: undefined;
  OnboardingVotingBadges: undefined;
  OnboardingReviewAsk: undefined;
  OnboardingPremiumIntro: undefined;
  // OnboardingTrialOffer removed - replaced with automatic 3-day trial
  // Legacy (keeping for backward compatibility during transition)
  OnboardingFrequency: undefined;
  OnboardingDiscovery: undefined;
  OnboardingPreferences: undefined;
  Main: undefined; // Navigation target after onboarding
};

// Bottom Tab Navigator param list
export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  Rewards: undefined;
  Profile: undefined;
};

// Root stack - no more drawer
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  RestaurantDetail: {
    id: string;
  };
  Category: {
    category: RestaurantCategory;
  };
  // View All screens
  HappyHoursViewAll: undefined;
  SpecialsViewAll: undefined;
  EventsViewAll: undefined;
  EntertainmentViewAll: undefined;
  FeaturedViewAll: undefined;
  CuisinesViewAll: undefined;
  CuisineDetail: { cuisine: CuisineType };
  // Event detail
  EventDetail: { event: ApiEvent };
  // Voting screens
  VoteCenter: undefined;
  VoteCategory: undefined;
  VoteRestaurant: { category: VoteCategory };
  VoteHistory: undefined;
  VoteLeaderboard: { category?: VoteCategory };
  // Feature request
  FeatureRequest: undefined;
  // Itinerary
  ItineraryBuilder: { date?: string };
  ItineraryDetail: { id: string };
  // Blog
  BlogViewAll: undefined;
  BlogDetail: { slug: string };
  // Artist
  ArtistDetail: { artistId: string; artistName: string };
};

// Type helpers for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
