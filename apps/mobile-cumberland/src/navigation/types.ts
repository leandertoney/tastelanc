import type { NavigatorScreenParams } from '@react-navigation/native';
import type { RestaurantCategory, CuisineType } from '../types/database';
import type { ApiEvent } from '../lib/events';
import type { ItineraryItemWithReason, ItineraryMood } from '../types/itinerary';

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
  CouponsViewAll: undefined;
  MyCoupons: undefined;
  CuisinesViewAll: undefined;
  CuisineDetail: { cuisine: CuisineType };
  // Event detail
  EventDetail: { event: ApiEvent };
  // Feature request
  FeatureRequest: undefined;
  // Itinerary
  ItineraryBuilder: { date?: string };
  ItineraryCard: {
    items: ItineraryItemWithReason[];
    walkMinutes: (number | null)[];
    mood: ItineraryMood | null;
    date: string;
    stopCount?: 2 | 3;
  };
  ItineraryDetail: { id: string };
  // Blog
  BlogViewAll: undefined;
  BlogDetail: { slug: string };
  // Artist
  ArtistDetail: { artistId: string; artistName: string };
  // Personal history
  MyRestaurants: undefined;
  Wishlist: undefined;
  // Flyer scanner
  FlyerCapture: undefined;
  FlyerProcessing: { imageUri: string };
  FlyerPreview: { flyerImageUrl: string; extracted: ExtractedEventData };
  FlyerPublishChoice: { draftData: FlyerDraftData };
  FlyerSuccess: { draftId: string; publishingPath: string; claimUrl?: string; venueName?: string };
  // Sales CRM
  SalesDashboard: undefined;
  EmailThread: { counterpartyEmail: string; counterpartyName?: string };
  ComposeEmail: { recipientEmail?: string; recipientName?: string; subject?: string; inReplyToMessageId?: string; threadId?: string };
  LeadDetail: { leadId: string };
};

// Flyer scanner types
export interface ExtractedEventData {
  event_name: string | null;
  venue_name: string | null;
  date: string | null;
  time_start: string | null;
  time_end: string | null;
  description: string | null;
  performers: string | null;
  ticket_link: string | null;
  category: string | null;
}

export interface FlyerDraftData {
  flyerImageUrl: string;
  eventName: string;
  venueName: string;
  venueId: string | null;
  date: string;
  timeStart: string;
  timeEnd: string;
  description: string;
  performers: string;
  category: string;
  marketId: string;
  extractedJson: ExtractedEventData;
  editedJson: Record<string, unknown>;
}

// Type helpers for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
