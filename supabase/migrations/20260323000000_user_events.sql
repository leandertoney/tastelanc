-- user_events: behavioral signal collection for Move tab personalization
-- Tracks dwell time, quick skips, and detail views to learn user content preferences over time.
-- Used by the Move algorithm to boost restaurants the user has shown interest in,
-- suppress items they consistently skip, and calculate per-user content type affinity.

CREATE TABLE user_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id  UUID        REFERENCES restaurants(id) ON DELETE CASCADE,
  event_type     TEXT        NOT NULL CHECK (event_type IN ('dwell', 'detail_view', 'quick_skip')),
  value_ms       INTEGER,    -- dwell / quick-skip duration in milliseconds
  feed_item_kind TEXT,       -- kind of feed card that triggered this event
  market_id      UUID        REFERENCES markets(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes optimized for the four read patterns used by usePersonalizedFeed:
-- 1. "What has this user dwelled on?" (getDwelledRestaurantIds)
-- 2. "What has this user tapped into?" (getDetailViewedIds)
-- 3. "What has this user repeatedly skipped?" (getQuickSkippedRestaurantIds)
-- 4. "What content types does this user prefer?" (getKindAffinity)
CREATE INDEX user_events_user_restaurant_idx ON user_events(user_id, restaurant_id, event_type);
CREATE INDEX user_events_user_kind_idx       ON user_events(user_id, feed_item_kind, event_type);
CREATE INDEX user_events_created_at_idx      ON user_events(created_at);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own events"
  ON user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own events"
  ON user_events FOR SELECT
  USING (auth.uid() = user_id);
