-- Migration: add_checkins_table
-- Creates the public.checkins table used by the social proof / engagement
-- features (ProfileStatsRow, RecentActivityFeed, MyRestaurantsScreen,
-- SocialProofBanner, and useRecordCheckinForSocialProof).
--
-- This is separate from the `visits` table (Radar geofence tracking).
-- Checkins are explicitly recorded when users earn points for visiting
-- a restaurant, and carry restaurant_name + points_earned for display.

CREATE TABLE IF NOT EXISTS public.checkins (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id   UUID        NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  restaurant_name TEXT        NOT NULL,
  points_earned   INTEGER     NOT NULL DEFAULT 10,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS checkins_user_id_idx     ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS checkins_restaurant_idx  ON public.checkins(restaurant_id);
CREATE INDEX IF NOT EXISTS checkins_created_at_idx  ON public.checkins(created_at DESC);

-- Row Level Security
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Users can read their own check-ins (Profile, My Restaurants, Recent Activity)
CREATE POLICY "Users can view own checkins"
  ON public.checkins
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can record their own check-ins (via useRecordCheckinForSocialProof)
CREATE POLICY "Users can insert own checkins"
  ON public.checkins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
