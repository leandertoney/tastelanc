import { getSupabase } from '../config/theme';
import type { Profile, PremiumSource } from '../types/database';

const PROFILE_AVATAR_API = 'https://tastelanc.com/api/mobile/profile/avatar';

/**
 * Fetch user's profile from Supabase
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows returned, which is expected if profile doesn't exist yet
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching profile:', error);
      throw error;
    }

    return data as Profile;
  } catch (error) {
    console.error('Error in getProfile:', error);
    return null;
  }
}

/**
 * Create a new profile for a user
 */
export async function createProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = getSupabase();
    const newProfile = {
      id: userId,
      premium_active: false,
      premium_source: null,
      premium_expires_at: null,
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }

    return data as Profile;
  } catch (error) {
    console.error('Error in createProfile:', error);
    return null;
  }
}

/**
 * Update user's premium status
 * Used by Stripe webhook handler or manual admin toggle
 */
export async function updatePremiumStatus(
  userId: string,
  premiumActive: boolean,
  source: PremiumSource,
  expiresAt: string | null
): Promise<Profile | null> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .update({
        premium_active: premiumActive,
        premium_source: source,
        premium_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating premium status:', error);
      throw error;
    }

    return data as Profile;
  } catch (error) {
    console.error('Error in updatePremiumStatus:', error);
    return null;
  }
}

/**
 * Check if user has active premium from Supabase profile
 * Returns true if premium_active is true AND not expired
 */
export async function hasWebPremium(userId: string): Promise<boolean> {
  try {
    const profile = await getProfile(userId);

    if (!profile || !profile.premium_active) {
      return false;
    }

    // Check expiration if set
    if (profile.premium_expires_at) {
      const expiresAt = new Date(profile.premium_expires_at);
      if (expiresAt < new Date()) {
        // Premium has expired - update the profile
        await updatePremiumStatus(userId, false, null, null);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking web premium:', error);
    return false;
  }
}

/**
 * Upload a profile avatar image via the web API.
 * imageBase64 is a raw base64 string (no data URI prefix).
 * Returns the public URL of the uploaded avatar.
 */
export async function uploadProfileAvatar(
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('No active session');
  }

  const response = await fetch(PROFILE_AVATAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ imageBase64, mimeType }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${response.status})`);
  }

  const { avatar_url } = await response.json();
  return avatar_url as string;
}

/**
 * Get or create profile for a user
 */
export async function getOrCreateProfile(userId: string): Promise<Profile | null> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      profile = await createProfile(userId);
    }

    return profile;
  } catch (error) {
    console.error('Error in getOrCreateProfile:', error);
    return null;
  }
}
