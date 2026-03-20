-- Fix party_invite_codes RLS: the permissive ALL policy incorrectly allowed anon access.
-- Service role bypasses RLS automatically — no explicit policy needed.
-- With RLS enabled and no SELECT policy, non-service-role users are denied.

DROP POLICY IF EXISTS "Service role can manage invite codes" ON public.party_invite_codes;

-- Also lock down party_rsvps: remove the broad service role policy (service role bypasses RLS anyway)
-- Keep only the user self-read policy
DROP POLICY IF EXISTS "Service role can manage rsvps" ON public.party_rsvps;
