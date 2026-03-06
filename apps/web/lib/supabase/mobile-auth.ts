import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client authenticated with the mobile app's Bearer token.
 * Mobile sends JWT via Authorization header (not cookies).
 */
export function createMobileClient(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) return null;

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
