-- Performance indexes for mobile app queries
-- These indexes address slow loading times on the home screen

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_is_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_restaurant_id ON events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_is_recurring ON events(is_recurring);
CREATE INDEX IF NOT EXISTS idx_events_composite ON events(is_active, event_date);

-- Happy hours table indexes
CREATE INDEX IF NOT EXISTS idx_happy_hours_is_active ON happy_hours(is_active);
CREATE INDEX IF NOT EXISTS idx_happy_hours_restaurant_id ON happy_hours(restaurant_id);

-- Restaurants table indexes
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_tier_id ON restaurants(tier_id);

-- Specials table indexes (if used by mobile app)
CREATE INDEX IF NOT EXISTS idx_specials_is_active ON specials(is_active);
CREATE INDEX IF NOT EXISTS idx_specials_restaurant_id ON specials(restaurant_id);
