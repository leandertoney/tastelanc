-- Retention: Labs / Feature Voting (Phase 5)
-- feature_votes: users upvote or downvote experimental feature ideas

CREATE TABLE IF NOT EXISTS public.feature_votes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id TEXT        NOT NULL,
  vote       SMALLINT    NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, feature_id)
);

CREATE INDEX IF NOT EXISTS feature_votes_feature_id_idx
  ON public.feature_votes(feature_id);

CREATE INDEX IF NOT EXISTS feature_votes_user_id_idx
  ON public.feature_votes(user_id);

ALTER TABLE public.feature_votes ENABLE ROW LEVEL SECURITY;

-- Aggregate vote counts are public (no PII exposed — only feature_id + vote)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_votes' AND policyname = 'feature_votes_public_read'
  ) THEN
    CREATE POLICY "feature_votes_public_read"
      ON public.feature_votes FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_votes' AND policyname = 'feature_votes_own_insert'
  ) THEN
    CREATE POLICY "feature_votes_own_insert"
      ON public.feature_votes FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_votes' AND policyname = 'feature_votes_own_update'
  ) THEN
    CREATE POLICY "feature_votes_own_update"
      ON public.feature_votes FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;
