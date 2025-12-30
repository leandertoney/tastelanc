// Chat message types for Rosie
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Session state stored in localStorage
export interface RosieSession {
  sessionId: string;
  messages: ChatMessage[];
  messageCount: number;
  createdAt: string;
}

// API request body
export interface ChatRequest {
  messages: ChatMessage[];
  sessionId: string;
}

// API response for rate limit exceeded
export interface RateLimitResponse {
  error: string;
  limitReached: true;
  redirectUrl: string;
}

// Streaming response chunk
export interface StreamChunk {
  text: string;
}

// Restaurant context for Rosie
export interface RestaurantContext {
  restaurants: RestaurantInfo[];
  happyHours: HappyHourInfo[];
  events: EventInfo[];
  specials: SpecialInfo[];
}

export interface RestaurantInfo {
  name: string;
  slug: string;
  address: string;
  city: string;
  description: string | null;
  categories: string[];
}

export interface HappyHourInfo {
  restaurantName: string;
  restaurantSlug: string;
  name: string;
  description: string | null;
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  items: HappyHourItemInfo[];
}

export interface HappyHourItemInfo {
  name: string;
  originalPrice: number | null;
  discountedPrice: number | null;
}

export interface EventInfo {
  restaurantName: string;
  restaurantSlug: string;
  name: string;
  description: string | null;
  eventType: string;
  daysOfWeek: string[];
  startTime: string;
  performerName: string | null;
}

export interface SpecialInfo {
  restaurantName: string;
  restaurantSlug: string;
  name: string;
  description: string | null;
  daysOfWeek: string[];
  specialPrice: number | null;
  discountDescription: string | null;
}

// localStorage keys
export const ROSIE_STORAGE_KEYS = {
  sessionId: 'rosie_chat_session_id',
  chatHistory: 'rosie_chat_history',
  messageCount: 'rosie_message_count',
  earlyAccessEmail: 'tastelanc_early_access_email',
  rosieAccessToken: 'rosie_access_token',
} as const;

// Rate limit configuration
export const ROSIE_CONFIG = {
  maxMessages: 5,
  redirectUrl: '/premium',
} as const;
