-- Fix video recommendation upload bug: FK on user_id → profiles(id) blocks users
-- who have an auth.users row but no profiles row (377 such users exist in production).
--
-- The FK was added in 20260309200000_recommendations_profiles_fk.sql solely so
-- PostgREST could resolve the embedded join `profiles:user_id(...)`. However, it
-- causes FK violations for any user without a profile row when they attempt to
-- insert a recommendation — even though a valid auth.users FK already exists.
--
-- Fix: drop the fragile profiles FK and rely only on the auth.users FK.
-- PostgREST can still join to profiles via the auth.users FK path or via a
-- manual foreign table hint; the profile data is not required at insert time.

ALTER TABLE public.restaurant_recommendations
  DROP CONSTRAINT IF EXISTS fk_recommendations_profiles;
