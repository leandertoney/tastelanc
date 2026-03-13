-- Swipe game analytics table (no auth required, insert-only via service role)
CREATE TABLE IF NOT EXISTS swipe_game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES markets(id),
  score INTEGER NOT NULL,
  total INTEGER NOT NULL DEFAULT 10,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: only service role can write
ALTER TABLE swipe_game_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public reads for potential leaderboard/stats
CREATE POLICY "Anyone can read game sessions"
  ON swipe_game_sessions FOR SELECT
  USING (true);
