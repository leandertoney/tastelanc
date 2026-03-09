-- Add FK from restaurant_recommendations.user_id to profiles.id
-- so PostgREST can resolve the embedded join: profiles:user_id(...)
ALTER TABLE restaurant_recommendations
ADD CONSTRAINT fk_recommendations_profiles
FOREIGN KEY (user_id) REFERENCES profiles(id);
