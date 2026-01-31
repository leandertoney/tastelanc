-- Fix RLS policy on push_tokens to allow INSERT operations
-- The original policy only had USING clause, which doesn't work for INSERTs
-- INSERT requires WITH CHECK clause

-- Drop existing policies (idempotent)
DROP POLICY IF EXISTS "Users can manage own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can read own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete own tokens" ON push_tokens;

-- Create separate policies for different operations
-- SELECT: Users can read their own tokens
CREATE POLICY "Users can read own tokens" ON push_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can insert tokens for themselves
CREATE POLICY "Users can insert own tokens" ON push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own tokens
CREATE POLICY "Users can update own tokens" ON push_tokens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own tokens
CREATE POLICY "Users can delete own tokens" ON push_tokens
  FOR DELETE USING (auth.uid() = user_id);
