-- Fix push_tokens SELECT RLS policy to allow upsert conflict detection.
--
-- Problem: When a user reinstalls the app, they get a new anonymous session
-- (new user_id) but the same device push token. The upsert tries to
-- INSERT ... ON CONFLICT (token) DO UPDATE, but the old row is hidden
-- by the SELECT policy (auth.uid() = user_id), so PostgreSQL can't detect
-- the conflict. The INSERT then fails with a unique constraint violation
-- disguised as an RLS error (42501).
--
-- Fix: Allow any authenticated user to read any push_token row.
-- Push tokens are opaque device identifiers and not sensitive.

DROP POLICY IF EXISTS "Users can read own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can read push tokens" ON push_tokens;

CREATE POLICY "Users can read push tokens" ON push_tokens
FOR SELECT
USING (true);
