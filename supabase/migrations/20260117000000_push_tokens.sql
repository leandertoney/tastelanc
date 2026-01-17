-- Create push_tokens table for storing Expo push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can manage own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can read own tokens" ON push_tokens;

-- Policy: Users can insert/update/delete their own tokens
CREATE POLICY "Users can manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Index for token lookups (used during upsert)
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- Comments
COMMENT ON TABLE push_tokens IS 'Expo push notification tokens for users';
COMMENT ON COLUMN push_tokens.token IS 'Expo push token (ExponentPushToken[...])';
COMMENT ON COLUMN push_tokens.platform IS 'Device platform (ios, android, web)';
