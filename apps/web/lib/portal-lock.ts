/**
 * Portal access lock.
 *
 * Reads the portal_access flag so the admin panel can be suspended for billing
 * without a redeploy. The row is service-role only, so this must never be
 * called from the browser.
 *
 * Flip it from the Supabase SQL editor:
 *   UPDATE portal_access SET is_locked = true,  locked_at = now(), updated_at = now() WHERE id = 'singleton';
 *   UPDATE portal_access SET is_locked = false, locked_at = null,  updated_at = now() WHERE id = 'singleton';
 */

export const PORTAL_LOCK_MESSAGE =
  'Payment overdue. Please complete payment in order to regain access to your account.';

/** Accounts that keep access while the portal is locked. */
export const PORTAL_LOCK_EXEMPT_USER_IDS = [
  'd1b931ce-66ca-40c1-8144-cabf146e006b', // leandertoney@gmail.com (super_admin)
];

type LockState = { isLocked: boolean; message: string };

const CACHE_TTL_MS = 30_000;
let cached: { value: LockState; at: number } | null = null;

export async function getPortalLockState(): Promise<LockState> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Without the service key we cannot read the flag. Fail open so a missing
  // env var can never lock every admin out of the panel by accident.
  if (!url || !serviceKey) return { isLocked: false, message: PORTAL_LOCK_MESSAGE };

  try {
    const res = await fetch(
      `${url}/rest/v1/portal_access?id=eq.singleton&select=is_locked,message`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) return { isLocked: false, message: PORTAL_LOCK_MESSAGE };

    const rows = (await res.json()) as { is_locked: boolean; message: string | null }[];
    const row = rows?.[0];
    const value: LockState = {
      isLocked: Boolean(row?.is_locked),
      message: row?.message || PORTAL_LOCK_MESSAGE,
    };
    cached = { value, at: Date.now() };
    return value;
  } catch {
    return { isLocked: false, message: PORTAL_LOCK_MESSAGE };
  }
}

export function isPortalLockExempt(userId: string | undefined | null): boolean {
  return !!userId && PORTAL_LOCK_EXEMPT_USER_IDS.includes(userId);
}
