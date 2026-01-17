-- Rosie Chat Cache - Semantic caching for AI responses
-- Requires pgvector extension for vector similarity search

-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create rosie_cache table for storing cached Q&A pairs
CREATE TABLE IF NOT EXISTS rosie_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  question_embedding vector(1536), -- OpenAI ada-002 embedding dimension
  answer TEXT NOT NULL,
  query_type TEXT, -- 'happy_hour', 'event', 'brunch', 'dinner', 'nightlife', 'outdoor', 'general'
  referenced_ids TEXT[], -- Restaurant IDs mentioned in the answer (for cache invalidation)
  hit_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster similarity search
CREATE INDEX IF NOT EXISTS rosie_cache_embedding_idx
  ON rosie_cache USING ivfflat (question_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS rosie_cache_last_used_idx ON rosie_cache (last_used_at);

-- Function to find similar cached questions using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_cache(
  query_embedding TEXT,
  similarity_threshold FLOAT DEFAULT 0.92
)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  query_type TEXT,
  hit_count INTEGER,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  embedding_vector vector(1536);
BEGIN
  -- Parse the JSON array string into a vector
  embedding_vector := query_embedding::vector(1536);

  RETURN QUERY
  SELECT
    rc.id,
    rc.question,
    rc.answer,
    rc.query_type,
    rc.hit_count,
    1 - (rc.question_embedding <=> embedding_vector) AS similarity
  FROM rosie_cache rc
  WHERE rc.question_embedding IS NOT NULL
    AND 1 - (rc.question_embedding <=> embedding_vector) >= similarity_threshold
  ORDER BY rc.question_embedding <=> embedding_vector
  LIMIT 1;
END;
$$;

-- RLS policies (service role bypasses RLS, but good to have explicit policies)
ALTER TABLE rosie_cache ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role key)
CREATE POLICY "Service role has full access to rosie_cache"
  ON rosie_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: cleanup function to remove old unused cache entries
CREATE OR REPLACE FUNCTION cleanup_rosie_cache(days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM rosie_cache
  WHERE last_used_at < NOW() - (days_old || ' days')::INTERVAL
    AND hit_count < 3;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
