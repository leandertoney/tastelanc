-- Restore foreign key from restaurant_recommendations.user_id → profiles.id
-- This was dropped in 20260404000000 to fix blocked inserts, but PostgREST
-- needs this FK to resolve the profiles:user_id(...) embedded join in queries.
-- Safe to re-add: all existing recommendation rows have a matching profiles row,
-- and the profiles table has an ON INSERT trigger from auth.users so new users
-- always get a profile before they can post recommendations.

ALTER TABLE restaurant_recommendations
  ADD CONSTRAINT fk_recommendations_profiles
  FOREIGN KEY (user_id) REFERENCES profiles(id)
  ON DELETE CASCADE
  DEFERRABLE INITIALLY DEFERRED;
