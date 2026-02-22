-- Squad Picker: group restaurant polls
-- Users create a poll with 2-5 restaurant choices, share a code,
-- friends vote, and the winner is revealed.

CREATE TABLE IF NOT EXISTS public.squad_polls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Where should we go?',
  restaurant_ids UUID[] NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '48 hours'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.squad_poll_votes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       UUID NOT NULL REFERENCES public.squad_polls(id) ON DELETE CASCADE,
  voter_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  restaurant_id UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One vote per user per poll
  UNIQUE (poll_id, voter_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS squad_polls_creator_idx ON public.squad_polls(creator_id);
CREATE INDEX IF NOT EXISTS squad_poll_votes_poll_idx ON public.squad_poll_votes(poll_id);

-- RLS: anyone can read polls and votes (polls are shared by code)
ALTER TABLE public.squad_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad polls are publicly readable"
  ON public.squad_polls FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create squad polls"
  ON public.squad_polls FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Squad votes are publicly readable"
  ON public.squad_poll_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote once per poll"
  ON public.squad_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);
