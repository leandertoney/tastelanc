-- Add featured_restaurants column to track which restaurants appear in each blog post
-- This helps avoid repeatedly featuring the same restaurants in consecutive posts

ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS featured_restaurants text[] DEFAULT '{}';

-- Add an index for efficient querying of featured restaurants
CREATE INDEX IF NOT EXISTS idx_blog_posts_featured_restaurants
ON public.blog_posts USING GIN (featured_restaurants);

-- Add comment explaining the column
COMMENT ON COLUMN public.blog_posts.featured_restaurants IS
'Array of restaurant slugs featured in this blog post, used to avoid repetition across posts';
