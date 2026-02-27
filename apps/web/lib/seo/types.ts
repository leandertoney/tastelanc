export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface Restaurant {
  id: string;
  owner_id: string | null;
  tier_id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  description: string | null;
  custom_description: string | null;
  primary_color: string;
  secondary_color: string;
  categories: string[];
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface HappyHour {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  days_of_week: DayOfWeek[];
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HappyHourItem {
  id: string;
  happy_hour_id: string;
  name: string;
  description: string | null;
  price: number | null;
}

export interface Special {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  original_price: number | null;
  special_price: number | null;
  discount_description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  event_type: string;
  is_recurring: boolean;
  days_of_week: DayOfWeek[];
  event_date: string | null;
  start_time: string;
  end_time: string | null;
  performer_name: string | null;
  cover_charge: number | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body_html: string;
  tags: string[];
  cover_image_url: string | null;
  created_at: string;
}
