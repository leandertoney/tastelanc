/**
 * Itinerary type definitions
 * For the "Plan Your Day" feature
 */

export type TimeSlot =
  | 'breakfast'
  | 'morning'
  | 'lunch'
  | 'afternoon'
  | 'happy_hour'
  | 'dinner'
  | 'evening';

export type ItineraryItemType = 'restaurant' | 'event' | 'happy_hour' | 'custom';

export interface Itinerary {
  id: string;
  user_id: string;
  title: string;
  date: string; // ISO date string (YYYY-MM-DD)
  notes: string | null;
  is_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItineraryItem {
  id: string;
  itinerary_id: string;
  sort_order: number;
  time_slot: TimeSlot;
  start_time: string | null;
  end_time: string | null;
  item_type: ItineraryItemType;
  restaurant_id: string | null;
  event_id: string | null;
  happy_hour_id: string | null;
  custom_title: string | null;
  custom_notes: string | null;
  display_name: string;
  display_address: string | null;
  display_latitude: number | null;
  display_longitude: number | null;
  display_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItineraryWithItems extends Itinerary {
  items: ItineraryItem[];
}

// Reason text for why a venue was picked for this slot
export interface ItineraryItemWithReason extends ItineraryItem {
  reason: string;
}

// Time slot display configuration
export const TIME_SLOT_CONFIG: Record<TimeSlot, {
  label: string;
  icon: string; // Ionicons name
  defaultTimeRange: string;
  sortOrder: number;
}> = {
  breakfast:  { label: 'Breakfast',    icon: 'cafe-outline',            defaultTimeRange: '8:00 - 10:00 AM',  sortOrder: 0 },
  morning:    { label: 'Mid-Morning',  icon: 'sunny-outline',           defaultTimeRange: '10:00 - 11:30 AM', sortOrder: 1 },
  lunch:      { label: 'Lunch',        icon: 'restaurant-outline',      defaultTimeRange: '11:30 AM - 1:30 PM', sortOrder: 2 },
  afternoon:  { label: 'Afternoon',    icon: 'walk-outline',            defaultTimeRange: '2:00 - 4:00 PM',   sortOrder: 3 },
  happy_hour: { label: 'Happy Hour',   icon: 'beer-outline',            defaultTimeRange: '4:00 - 6:00 PM',   sortOrder: 4 },
  dinner:     { label: 'Dinner',       icon: 'wine-outline',            defaultTimeRange: '6:00 - 8:00 PM',   sortOrder: 5 },
  evening:    { label: 'Evening Out',  icon: 'musical-notes-outline',   defaultTimeRange: '8:00 PM+',         sortOrder: 6 },
};

export const ALL_TIME_SLOTS: TimeSlot[] = [
  'breakfast',
  'morning',
  'lunch',
  'afternoon',
  'happy_hour',
  'dinner',
  'evening',
];

// Mood/preference chips for the builder prompt
export type ItineraryMood =
  | 'foodie_tour'
  | 'date_night'
  | 'brunch_lover'
  | 'family_day'
  | 'bar_crawl'
  | 'budget_friendly';

export const ITINERARY_MOODS: Record<ItineraryMood, {
  label: string;
  icon: string;
  description: string;
}> = {
  foodie_tour:     { label: 'Foodie Tour',     icon: 'restaurant',      description: 'Hit the best spots in town' },
  date_night:      { label: 'Date Night',      icon: 'heart',           description: 'Romantic dinner & drinks' },
  brunch_lover:    { label: 'Brunch Lover',    icon: 'cafe',            description: 'Start the day right' },
  family_day:      { label: 'Family Day',      icon: 'people',          description: 'Something for everyone' },
  bar_crawl:       { label: 'Bar Crawl',       icon: 'beer',            description: 'Happy hours & nightlife' },
  budget_friendly: { label: 'Budget Friendly', icon: 'cash',            description: 'Great food, great value' },
};
