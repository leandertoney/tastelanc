-- Add market_slug to rosie_cache so cached responses are scoped per market
-- Without this, a Lancaster cached answer could be served to Cumberland users

ALTER TABLE rosie_cache ADD COLUMN IF NOT EXISTS market_slug TEXT;

-- Index for faster lookups filtered by market
CREATE INDEX IF NOT EXISTS rosie_cache_market_slug_idx ON rosie_cache (market_slug);

-- Replace find_similar_cache to accept and filter by market_slug
CREATE OR REPLACE FUNCTION find_similar_cache(
  query_embedding TEXT,
  similarity_threshold FLOAT DEFAULT 0.92,
  p_market_slug TEXT DEFAULT NULL
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
    AND (p_market_slug IS NULL OR rc.market_slug = p_market_slug)
  ORDER BY rc.question_embedding <=> embedding_vector
  LIMIT 1;
END;
$$;
