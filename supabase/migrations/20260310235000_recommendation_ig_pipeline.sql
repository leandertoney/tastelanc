-- Add Instagram auto-posting pipeline columns to restaurant_recommendations
-- Supports: AI review → 30-min countdown → auto-post to Instagram

-- Instagram posting status
-- pending: awaiting AI review
-- ai_approved: AI approved, countdown running
-- admin_approved: manually approved, post immediately
-- posted: successfully posted to Instagram
-- rejected: rejected by AI or admin
ALTER TABLE restaurant_recommendations
ADD COLUMN ig_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (ig_status IN ('pending', 'ai_approved', 'admin_approved', 'posted', 'rejected'));

-- When the AI approves, set this to now() + 30 min — auto-posts after this time
ALTER TABLE restaurant_recommendations
ADD COLUMN ig_scheduled_at TIMESTAMPTZ;

-- Instagram post/reel ID after successful publish
ALTER TABLE restaurant_recommendations
ADD COLUMN ig_post_id TEXT;

-- AI review reasoning (shown to admin in approval queue)
ALTER TABLE restaurant_recommendations
ADD COLUMN ai_review_notes TEXT;

-- Admin who approved/rejected (NULL = AI auto-decision)
ALTER TABLE restaurant_recommendations
ADD COLUMN ig_reviewed_by UUID REFERENCES auth.users(id);

-- Optional: admin-edited caption for Instagram (different from in-app caption)
ALTER TABLE restaurant_recommendations
ADD COLUMN ig_caption_override TEXT;

-- Index for the cron job that posts approved recs whose countdown expired
CREATE INDEX idx_recommendations_ig_pending_post
  ON restaurant_recommendations(ig_status, ig_scheduled_at)
  WHERE ig_status IN ('ai_approved', 'admin_approved');
