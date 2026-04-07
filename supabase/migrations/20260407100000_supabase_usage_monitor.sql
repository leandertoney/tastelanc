-- Supabase Usage Monitor
-- Provides RPC functions to check database size and storage usage,
-- plus a table to track usage over time for trend analysis.

-- RPC: Get database size in bytes
CREATE OR REPLACE FUNCTION public.get_db_size()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pg_database_size(current_database());
$$;

-- RPC: Get storage usage summary (object count + total bytes per bucket)
CREATE OR REPLACE FUNCTION public.get_storage_usage()
RETURNS TABLE(bucket_id text, object_count bigint, total_bytes bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    bucket_id,
    COUNT(*)::bigint AS object_count,
    COALESCE(SUM(
      CASE WHEN (metadata->>'size') IS NOT NULL
           THEN (metadata->>'size')::bigint
           ELSE 0
      END
    ), 0)::bigint AS total_bytes
  FROM storage.objects
  WHERE name IS NOT NULL
  GROUP BY bucket_id;
$$;

-- Table: Track usage snapshots over time
CREATE TABLE IF NOT EXISTS public.supabase_usage_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at timestamptz DEFAULT now() NOT NULL,
  db_size_bytes bigint NOT NULL,
  storage_size_bytes bigint NOT NULL,
  storage_object_count integer NOT NULL,
  mau integer,
  edge_function_invocations integer,
  details jsonb DEFAULT '{}'::jsonb
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_usage_snapshots_checked_at
  ON public.supabase_usage_snapshots (checked_at DESC);

-- Auto-cleanup: keep 90 days
ALTER TABLE public.supabase_usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on usage snapshots"
  ON public.supabase_usage_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function (called by cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_old_usage_snapshots()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.supabase_usage_snapshots
  WHERE checked_at < now() - interval '90 days';
$$;
