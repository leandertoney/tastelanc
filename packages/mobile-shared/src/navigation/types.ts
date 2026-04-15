/**
 * Shared navigation types — defines the route names and params used by shared components.
 * Each app's RootStackParamList must extend or satisfy this interface.
 */

import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CuisineType, RestaurantCategory } from '../types/database';
import type { ApiEvent } from '../lib/events';

// Bottom Tab Navigator param list (shared across apps)
export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  Move: undefined;
  Profile: undefined;
  Sales: undefined;
};

/**
 * Minimal RootStackParamList that shared components need.
 * Each app's full RootStackParamList must be a superset of this.
 *
 * We use `Record<string, any>` intersection to allow navigation to
 * app-specific screens without compile errors in shared code.
 */
export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  RestaurantDetail: { id: string; isDailyPick?: boolean; initialTab?: string };
  Category: { category: RestaurantCategory };
  // View All screens
  HappyHoursViewAll: undefined;
  SpecialsViewAll: undefined;
  EventsViewAll: undefined;
  EntertainmentViewAll: undefined;
  CouponsViewAll: undefined;
  MyCoupons: undefined;
  FeaturedViewAll: undefined;
  CuisinesViewAll: undefined;
  CuisineDetail: { cuisine: CuisineType };
  // Event detail
  EventDetail: { event: ApiEvent };
  // Blog
  BlogViewAll: undefined;
  BlogDetail: { slug: string };
  // Artist
  ArtistDetail: { artistId: string; artistName: string };
  // Flyer scanner
  FlyerCapture: undefined;
  FlyerProcessing: { imageUri: string };
  FlyerPreview: { flyerImageUrl: string; extracted: ExtractedEventData };
  FlyerPublishChoice: { draftData: FlyerDraftData };
  FlyerSuccess: { draftId: string; publishingPath: string; claimUrl?: string; venueName?: string };
  // Settings
  Settings: undefined;
  // In-app browser
  InAppBrowser: { url: string; title?: string };
  // Feature request
  FeatureRequest: undefined;
  // Personal history
  MyRestaurants: undefined;
  // Sales CRM
  SalesDashboard: undefined;
  EmailThread: { counterpartyEmail: string; counterpartyName?: string };
  ComposeEmail: { recipientEmail?: string; recipientName?: string; subject?: string; inReplyToMessageId?: string; threadId?: string };
  LeadDetail: { leadId: string };
  // Video Recommendations
  VideoRecommendCapture: { restaurantId: string; restaurantName: string };
  // Editor sits between capture and preview — TikTok-style full-screen editing
  VideoEditor: {
    clips: { uri: string; duration: number }[];
    restaurantId: string;
    restaurantName: string;
    durationSeconds: number;
  };
  VideoRecommendPreview: {
    clips: { uri: string; duration: number }[];
    restaurantId: string;
    restaurantName: string;
    durationSeconds: number;
    textOverlays?: import('../types/database').TextOverlay[];
    captionWords?: import('../types/database').CaptionWord[];
    captionsEnabled?: boolean;
  };
  // Holiday / Seasonal
  StPatricksDay: undefined;
  RestaurantWeek: undefined;
  CoffeeChocolateTrail: undefined;
  ThirstyKnowledge: undefined;
  TFKLeaderboard: undefined;
  TFKWinners: undefined;
  // Party RSVP
  PartyRSVP: undefined;
  PartyTicket: { qr_token: string; name?: string };
  // Retention screens
  Leaderboard: undefined;
  Labs: undefined;
  RewardClaim: {
    claim_token: string;
    restaurant_name: string;
    reward_description: string;
    expires_at: string;
  };
  // Itinerary
  ItineraryBuilder: { date?: string };
  ItineraryCard: {
    items: any[];
    walkMinutes: (number | null)[];
    mood: string | null;
    date: string;
    stopCount?: number;
  };
  // Paywall (modal)
  Paywall: { source: string };
  // Debug/Test screens
  TestRevenueCat: undefined;
} & Record<string, any>;

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

// Onboarding Navigator param list (shared across apps)
export type OnboardingStackParamList = {
  // Phase 1: Welcome, Problem & Solution
  OnboardingSlides: undefined;
  OnboardingProblems: undefined;
  OnboardingSolution: undefined;
  // Feature Discovery
  OnboardingHappyHours: undefined;
  OnboardingEvents: undefined;
  OnboardingSpecials: undefined;
  OnboardingMove: undefined;
  OnboardingVideoRecs: undefined;
  OnboardingRewards: undefined;
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
  OnboardingPaywall: undefined;
  OnboardingLifetimeOffer: undefined;
  OnboardingPremiumIntro: undefined;
  // Legacy (keeping for backward compatibility during transition)
  OnboardingFrequency: undefined;
  OnboardingDiscovery: undefined;
  OnboardingPreferences: undefined;
  Main: undefined; // Navigation target after onboarding
};
