/**
 * Mock Data Configuration
 *
 * Set ENABLE_MOCK_DATA to false for production builds.
 * When enabled, mock data will be shown when real data is empty.
 */

import type { EventType, Restaurant, CuisineType, RestaurantCategory } from '../types/database';
import type { ApiEvent } from '../lib/events';

// ============================================================
// GLOBAL TOGGLE - Automatically disabled in production builds
// Set to true only for local development/demos
// ============================================================
export const ENABLE_MOCK_DATA = false; // Temporarily disabled for testing real database

// ============================================================
// ENTERTAINMENT MOCK DATA
// ============================================================
export interface MockEntertainment {
  id: string;
  name: string;
  eventType: EventType;
  time: string;
  venue?: string;
  imageUrl?: string;
  restaurantId?: string;
  originalEvent?: ApiEvent; // For navigation to event detail
}

export const MOCK_ENTERTAINMENT: MockEntertainment[] = [
  {
    id: 'mock-ent-1',
    name: 'Live Jazz Night',
    eventType: 'live_music',
    time: '8pm-11pm',
    venue: 'The Pressroom',
    imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400&h=400&fit=crop',
  },
  {
    id: 'mock-ent-2',
    name: 'Trivia Tuesday',
    eventType: 'trivia',
    time: '7pm-9pm',
    venue: 'Annie Baileys',
    imageUrl: 'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=400&h=400&fit=crop',
  },
  {
    id: 'mock-ent-3',
    name: 'DJ Night',
    eventType: 'dj',
    time: '10pm-2am',
    venue: 'Tellus360',
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220e7a26e93?w=400&h=400&fit=crop',
  },
  {
    id: 'mock-ent-4',
    name: 'Karaoke Night',
    eventType: 'karaoke',
    time: '9pm-12am',
    venue: 'The Village',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
  },
];

// ============================================================
// EVENTS MOCK DATA
// ============================================================
export interface MockEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  venue?: string;
  isCityWide: boolean;
  imageUrl?: string;
  restaurantId?: string;
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    id: 'mock-event-1',
    name: 'Salsa Night',
    date: 'Every Friday',
    time: '9pm-1am',
    venue: 'Tellus360',
    isCityWide: false,
    imageUrl: 'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=400&h=300&fit=crop',
  },
  {
    id: 'mock-event-2',
    name: 'Silent Disco',
    date: 'Dec 14, 2024',
    time: '10pm-2am',
    venue: 'The Pressroom',
    isCityWide: false,
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-d220e7a26e93?w=400&h=300&fit=crop',
  },
  {
    id: 'mock-event-3',
    name: 'Wine Tasting',
    date: 'Dec 15, 2024',
    time: '6pm-9pm',
    venue: 'Cork & Cap',
    isCityWide: false,
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
  },
];

// ============================================================
// HAPPY HOUR MOCK DATA
// ============================================================
export interface MockHappyHour {
  id: string;
  restaurantName: string;
  deal: string;
  timeWindow: string;
  imageUrl?: string;
  restaurantId?: string;
}

export const MOCK_HAPPY_HOURS: MockHappyHour[] = [
  {
    id: 'mock-hh-1',
    restaurantName: 'Iron Hill Brewery',
    deal: '$5 Draft Beers',
    timeWindow: '4pm-6pm',
    imageUrl: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&h=300&fit=crop',
  },
  {
    id: 'mock-hh-2',
    restaurantName: 'The Fridge',
    deal: 'Half-Price Apps',
    timeWindow: '5pm-7pm',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
  },
  {
    id: 'mock-hh-3',
    restaurantName: 'Shot & Bottle',
    deal: '$6 Cocktails',
    timeWindow: '4pm-7pm',
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
  },
  {
    id: 'mock-hh-4',
    restaurantName: 'Luca',
    deal: '$8 Wine & Appetizers',
    timeWindow: '3pm-6pm',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=300&fit=crop',
  },
];

// ============================================================
// SOCIAL PROOF MOCK DATA
// ============================================================
export interface MockSocialProofStats {
  totalVoters: number;
  checkinsToday: number;
  checkinsThisWeek: number;
  daysLeftToVote: number;
}

export const MOCK_SOCIAL_PROOF_STATS: MockSocialProofStats = {
  totalVoters: 247,
  checkinsToday: 18,
  checkinsThisWeek: 89,
  daysLeftToVote: 5,
};

export interface MockTrendingRestaurant {
  restaurantId: string;
  restaurantName: string;
  badgeType: 'top_pick' | 'trending' | 'rising' | 'popular' | 'new_votes';
}

export const MOCK_TRENDING_RESTAURANTS: MockTrendingRestaurant[] = [
  { restaurantId: 'mock-1', restaurantName: 'Iron Hill Brewery', badgeType: 'top_pick' },
  { restaurantId: 'mock-2', restaurantName: 'Tellus360', badgeType: 'trending' },
  { restaurantId: 'mock-3', restaurantName: 'The Fridge', badgeType: 'rising' },
  { restaurantId: 'mock-4', restaurantName: 'Shot & Bottle', badgeType: 'popular' },
];

// ============================================================
// FEATURED RESTAURANTS MOCK DATA
// Full Restaurant objects for FeaturedSection
// ============================================================

export const MOCK_FEATURED_RESTAURANTS: Restaurant[] = [
  {
    id: 'mock-feat-1',
    name: 'Iron Hill Brewery',
    slug: 'iron-hill-brewery',
    address: '781 Harrisburg Pike',
    city: 'Lancaster',
    state: 'PA',
    zip_code: '17603',
    phone: '(717) 291-9800',
    website: 'https://ironhillbrewery.com',
    menu_link: null,
    latitude: 40.0379,
    longitude: -76.3055,
    logo_url: null,
    cover_image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop',
    photos: null,
    description: 'Craft brewery and restaurant with award-winning beers and American fare.',
    custom_description: null,
    categories: ['dinner', 'bars'] as RestaurantCategory[],
    features: [],
    cuisine: 'american_contemporary' as CuisineType,
    is_active: true,
    is_verified: true,
    tier_id: null,
    average_rating: null,
    tastelancrating: null,
    tastelancrating_count: 0,
    google_place_id: null,
    google_rating: null,
    google_review_count: 0,
    google_review_highlights: null,
    price_range: null,
    signature_dishes: null,
    vibe_tags: null,
    best_for: null,
    neighborhood: null,
    parking_info: null,
    noise_level: null,
    checkin_pin: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-feat-2',
    name: 'Luca',
    slug: 'luca',
    address: '436 W James St',
    city: 'Lancaster',
    state: 'PA',
    zip_code: '17603',
    phone: '(717) 299-0101',
    website: 'https://lucalancaster.com',
    menu_link: null,
    latitude: 40.0421,
    longitude: -76.3122,
    logo_url: null,
    cover_image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
    photos: null,
    description: 'Upscale Italian dining with handmade pasta and seasonal ingredients.',
    custom_description: null,
    categories: ['dinner'] as RestaurantCategory[],
    features: [],
    cuisine: 'italian' as CuisineType,
    is_active: true,
    is_verified: true,
    tier_id: null,
    average_rating: null,
    tastelancrating: null,
    tastelancrating_count: 0,
    google_place_id: null,
    google_rating: null,
    google_review_count: 0,
    google_review_highlights: null,
    price_range: null,
    signature_dishes: null,
    vibe_tags: null,
    best_for: null,
    neighborhood: null,
    parking_info: null,
    noise_level: null,
    checkin_pin: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ============================================================
// HELPER FUNCTION
// ============================================================

/**
 * Returns mock data if enabled and real data is empty, otherwise returns real data
 */
export function withMockFallback<T>(realData: T[], mockData: T[]): T[] {
  if (ENABLE_MOCK_DATA && realData.length === 0) {
    return mockData;
  }
  return realData;
}
