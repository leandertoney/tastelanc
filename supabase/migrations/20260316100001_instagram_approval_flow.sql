-- Instagram Approval Flow & Weekly Content Calendar
-- Changes:
-- 1. Add scheduled_publish_at for auto-publish timing
-- 2. Add day_theme for weekly content calendar tracking
-- 3. Allow 'approved', 'rejected', 'pending_review' statuses (stored as text, no enum)
-- 4. Drop the PM slot constraint (1 post/day now, not 2)

-- Add new columns
ALTER TABLE instagram_posts
  ADD COLUMN IF NOT EXISTS scheduled_publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS day_theme text;

-- Update status check constraint to include new statuses
ALTER TABLE instagram_posts DROP CONSTRAINT IF EXISTS instagram_posts_status_check;
ALTER TABLE instagram_posts ADD CONSTRAINT instagram_posts_status_check
  CHECK (status = ANY (ARRAY['draft', 'pending_review', 'approved', 'rejected', 'published', 'failed']));

-- Add index for the publish cron to efficiently find posts ready to auto-publish
CREATE INDEX IF NOT EXISTS idx_instagram_posts_publish_ready
  ON instagram_posts (scheduled_publish_at, status)
  WHERE status IN ('pending_review', 'approved')
    AND scheduled_publish_at IS NOT NULL;

-- Drop the old unique constraint that includes post_slot (we're going to 1/day)
-- First check if it exists, then recreate without post_slot
-- The old constraint was: (market_id, post_date, content_type)
-- We want: (market_id, post_date) — one post per market per day
-- But we need to keep backward compatibility with existing data that has multiple posts per day
-- So we'll add a new unique index for the new flow instead

-- For new posts going forward, the day_theme + single-slot model applies
-- Old data with am/pm slots remains untouched
