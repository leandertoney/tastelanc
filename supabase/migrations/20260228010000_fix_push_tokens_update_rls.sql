-- Fix push_tokens UPDATE RLS policy to allow upsert when device re-registers
-- with a new user session (e.g. anonymous session rotation).
--
-- The old policy required auth.uid() = user_id on the EXISTING row,
-- which blocked upserts when the same device token was previously registered
-- under a different user (common with anonymous auth).
--
-- New policy: any authenticated user can update any push_token row,
-- but can only set user_id to their own (WITH CHECK).
-- This is safe because push tokens are device-specific.

DROP POLICY IF EXISTS "Users can update own tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update push tokens" ON push_tokens;

CREATE POLICY "Users can update push tokens" ON push_tokens
FOR UPDATE
USING (true)
WITH CHECK (auth.uid() = user_id);
