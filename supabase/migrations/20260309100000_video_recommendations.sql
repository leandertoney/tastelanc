-- Video Recommendations: user-generated video recommendations for restaurants
-- Framed as "recommendations" (positive framing) not "reviews"

-- Main recommendations table
CREATE TABLE IF NOT EXISTS restaurant_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  caption_tag TEXT, -- e.g. 'must_try_dish', 'best_vibes', 'hidden_gem', etc.
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE, -- restaurant owner can pin
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE, -- flagged for moderation
  is_visible BOOLEAN NOT NULL DEFAULT TRUE, -- hidden by moderation
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Likes on recommendations
CREATE TABLE IF NOT EXISTS recommendation_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES restaurant_recommendations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(recommendation_id, user_id)
);

-- Indexes for common queries
CREATE INDEX idx_recommendations_restaurant ON restaurant_recommendations(restaurant_id, is_visible, created_at DESC);
CREATE INDEX idx_recommendations_user ON restaurant_recommendations(user_id, created_at DESC);
CREATE INDEX idx_recommendations_market ON restaurant_recommendations(market_id, is_visible, created_at DESC);
CREATE INDEX idx_recommendations_trending ON restaurant_recommendations(is_visible, view_count DESC, created_at DESC);
CREATE INDEX idx_recommendation_likes_rec ON recommendation_likes(recommendation_id);
CREATE INDEX idx_recommendation_likes_user ON recommendation_likes(user_id);

-- RLS Policies
ALTER TABLE restaurant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read visible recommendations
CREATE POLICY "Anyone can read visible recommendations"
  ON restaurant_recommendations FOR SELECT
  USING (is_visible = TRUE);

-- Users can insert their own recommendations
CREATE POLICY "Users can insert own recommendations"
  ON restaurant_recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own recommendations
CREATE POLICY "Users can update own recommendations"
  ON restaurant_recommendations FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own recommendations
CREATE POLICY "Users can delete own recommendations"
  ON restaurant_recommendations FOR DELETE
  USING (auth.uid() = user_id);

-- Anyone can read likes
CREATE POLICY "Anyone can read recommendation likes"
  ON recommendation_likes FOR SELECT
  USING (TRUE);

-- Users can insert their own likes
CREATE POLICY "Users can like recommendations"
  ON recommendation_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can unlike recommendations"
  ON recommendation_likes FOR DELETE
  USING (auth.uid() = user_id);

-- RPC function to atomically increment view count
CREATE OR REPLACE FUNCTION increment_recommendation_views(rec_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE restaurant_recommendations
  SET view_count = view_count + 1
  WHERE id = rec_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to keep like_count in sync
CREATE OR REPLACE FUNCTION update_recommendation_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE restaurant_recommendations
    SET like_count = like_count + 1
    WHERE id = NEW.recommendation_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE restaurant_recommendations
    SET like_count = like_count - 1
    WHERE id = OLD.recommendation_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_like_count
  AFTER INSERT OR DELETE ON recommendation_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendation_like_count();

-- Storage bucket for recommendation videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('recommendation-videos', 'recommendation-videos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read, authenticated users can upload
CREATE POLICY "Public read access for recommendation videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recommendation-videos');

CREATE POLICY "Authenticated users can upload recommendation videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recommendation-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own recommendation videos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recommendation-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own recommendation videos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'recommendation-videos' AND auth.uid()::text = (storage.foldername(name))[1]);
