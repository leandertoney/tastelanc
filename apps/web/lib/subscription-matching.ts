/**
 * Subscription Matching Utilities
 *
 * Multi-layer matching system to connect Stripe subscriptions with restaurants.
 * Designed to be airtight - catches edge cases like:
 * - luckydog@gmail.com vs jack@luckydog.com
 * - Different business names in Stripe vs database
 * - Phone number format variations
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface StripeCustomerInfo {
  customerId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  metadata: Record<string, string>;
}

export interface MatchAttempt {
  method: string;
  searched: string | null;
  found: boolean;
  restaurantId?: string;
  restaurantName?: string;
  confidence: number; // 0-100
  timestamp: string;
}

export interface MatchResult {
  matched: boolean;
  restaurantId: string | null;
  restaurantName: string | null;
  confidence: number;
  matchMethod: string | null;
  attempts: MatchAttempt[];
}

// ===== DOMAIN EXTRACTION =====

/**
 * Extract domain from email address
 * e.g., "jack@luckydog.com" -> "luckydog.com"
 * e.g., "luckydog@gmail.com" -> null (generic email provider)
 */
export function extractEmailDomain(email: string | null): string | null {
  if (!email) return null;

  const genericDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
    'icloud.com', 'me.com', 'mac.com', 'live.com', 'msn.com',
    'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com',
    'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net',
  ];

  const match = email.toLowerCase().match(/@([^@]+)$/);
  if (!match) return null;

  const domain = match[1];
  if (genericDomains.includes(domain)) return null;

  return domain;
}

/**
 * Extract domain from website URL
 * e.g., "https://www.luckydog.com/menu" -> "luckydog.com"
 */
export function extractWebsiteDomain(website: string | null): string | null {
  if (!website) return null;

  try {
    // Add protocol if missing
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const parsed = new URL(url);
    let domain = parsed.hostname.toLowerCase();

    // Remove www prefix
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    return domain;
  } catch {
    return null;
  }
}

/**
 * Extract business-relevant words from email username
 * e.g., "luckydog@gmail.com" -> ["lucky", "dog"]
 * e.g., "thefridge.lancaster@gmail.com" -> ["fridge", "lancaster"]
 */
export function extractEmailKeywords(email: string | null): string[] {
  if (!email) return [];

  const username = email.toLowerCase().split('@')[0];
  if (!username) return [];

  // Remove common prefixes/suffixes
  const cleaned = username
    .replace(/^(info|contact|hello|admin|support|sales|booking|reservations?)/, '')
    .replace(/\d+$/, ''); // Remove trailing numbers

  // Split on common separators and filter out noise
  const parts = cleaned.split(/[._-]+/).filter(p => p.length > 2);

  // Filter out common noise words
  const noiseWords = ['the', 'and', 'llc', 'inc', 'bar', 'restaurant', 'cafe', 'pub'];
  return parts.filter(p => !noiseWords.includes(p));
}

// ===== PHONE NORMALIZATION =====

/**
 * Normalize phone number to digits only
 * e.g., "+1 (717) 555-1234" -> "17175551234"
 * e.g., "717-555-1234" -> "7175551234"
 */
export function normalizePhone(phone: string | null): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, '');

  // Handle various formats
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.substring(1);
  if (digits.length >= 10) return digits.slice(-10); // Take last 10 digits

  return digits.length >= 7 ? digits : null;
}

/**
 * Check if two phone numbers match
 */
export function phonesMatch(phone1: string | null, phone2: string | null): boolean {
  const n1 = normalizePhone(phone1);
  const n2 = normalizePhone(phone2);

  if (!n1 || !n2) return false;
  return n1 === n2;
}

// ===== FUZZY NAME MATCHING =====

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings (0-100)
 */
export function stringSimilarity(a: string | null, b: string | null): number {
  if (!a || !b) return 0;

  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);

  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Normalize business name for comparison
 * - Removes common suffixes (LLC, Inc, etc.)
 * - Removes "The" prefix
 * - Removes special characters
 */
export function normalizeBusinessName(name: string | null): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/\b(llc|inc|incorporated|corp|corporation|co|company|ltd|limited)\b/gi, '')
    .replace(/^the\s+/i, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if names match with fuzzy logic
 * Returns confidence score (0-100)
 */
export function namesMatch(name1: string | null, name2: string | null): number {
  const n1 = normalizeBusinessName(name1);
  const n2 = normalizeBusinessName(name2);

  if (!n1 || !n2) return 0;

  // Exact match after normalization
  if (n1 === n2) return 100;

  // One contains the other
  if (n1.includes(n2) || n2.includes(n1)) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length < n2.length ? n2 : n1;
    return Math.round((shorter.length / longer.length) * 90);
  }

  // Fuzzy match
  return stringSimilarity(n1, n2);
}

// ===== MAIN MATCHING FUNCTION =====

/**
 * Find matching restaurant using multi-layer approach
 * Returns the best match with confidence score
 */
export async function findMatchingRestaurant(
  supabase: SupabaseClient,
  customer: StripeCustomerInfo,
  existingSubscriptionId?: string
): Promise<MatchResult> {
  const attempts: MatchAttempt[] = [];
  const timestamp = new Date().toISOString();

  // Helper to record attempt
  const recordAttempt = (
    method: string,
    searched: string | null,
    found: boolean,
    restaurantId?: string,
    restaurantName?: string,
    confidence: number = 0
  ) => {
    attempts.push({
      method,
      searched,
      found,
      restaurantId,
      restaurantName,
      confidence,
      timestamp,
    });
  };

  // ===== LAYER 1: Direct ID matches (highest confidence) =====

  // 1a. Match by existing subscription ID
  if (existingSubscriptionId) {
    const { data: bySubId } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('stripe_subscription_id', existingSubscriptionId)
      .single();

    if (bySubId) {
      recordAttempt('subscription_id', existingSubscriptionId, true, bySubId.id, bySubId.name, 100);
      return {
        matched: true,
        restaurantId: bySubId.id,
        restaurantName: bySubId.name,
        confidence: 100,
        matchMethod: 'subscription_id',
        attempts,
      };
    }
    recordAttempt('subscription_id', existingSubscriptionId, false);
  }

  // 1b. Match by customer ID on restaurant
  const { data: byCustomerId } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('stripe_customer_id', customer.customerId)
    .single();

  if (byCustomerId) {
    recordAttempt('customer_id_restaurant', customer.customerId, true, byCustomerId.id, byCustomerId.name, 100);
    return {
      matched: true,
      restaurantId: byCustomerId.id,
      restaurantName: byCustomerId.name,
      confidence: 100,
      matchMethod: 'customer_id_restaurant',
      attempts,
    };
  }
  recordAttempt('customer_id_restaurant', customer.customerId, false);

  // 1c. Match by customer ID through profile (owner)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customer.customerId)
    .single();

  if (profile) {
    const { data: byOwner } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('owner_id', profile.id)
      .single();

    if (byOwner) {
      recordAttempt('customer_id_owner', customer.customerId, true, byOwner.id, byOwner.name, 95);
      return {
        matched: true,
        restaurantId: byOwner.id,
        restaurantName: byOwner.name,
        confidence: 95,
        matchMethod: 'customer_id_owner',
        attempts,
      };
    }
  }
  recordAttempt('customer_id_owner', customer.customerId, false);

  // ===== LAYER 2: Email-based matching =====

  if (customer.email) {
    const emailLower = customer.email.toLowerCase();

    // 2a. Exact email match on restaurant
    const { data: byEmail } = await supabase
      .from('restaurants')
      .select('id, name')
      .ilike('email', emailLower)
      .single();

    if (byEmail) {
      recordAttempt('email_exact', emailLower, true, byEmail.id, byEmail.name, 90);
      return {
        matched: true,
        restaurantId: byEmail.id,
        restaurantName: byEmail.name,
        confidence: 90,
        matchMethod: 'email_exact',
        attempts,
      };
    }
    recordAttempt('email_exact', emailLower, false);

    // 2b. Email through profile then restaurant
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', emailLower)
      .single();

    if (profileByEmail) {
      const { data: byProfileEmail } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('owner_id', profileByEmail.id)
        .single();

      if (byProfileEmail) {
        recordAttempt('email_profile_owner', emailLower, true, byProfileEmail.id, byProfileEmail.name, 85);
        return {
          matched: true,
          restaurantId: byProfileEmail.id,
          restaurantName: byProfileEmail.name,
          confidence: 85,
          matchMethod: 'email_profile_owner',
          attempts,
        };
      }
    }
    recordAttempt('email_profile_owner', emailLower, false);

    // 2c. Domain matching - email domain vs website domain
    const emailDomain = extractEmailDomain(customer.email);
    if (emailDomain) {
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name, website')
        .not('website', 'is', null);

      if (restaurants) {
        for (const r of restaurants) {
          const websiteDomain = extractWebsiteDomain(r.website);
          if (websiteDomain && emailDomain === websiteDomain) {
            recordAttempt('domain_match', `${emailDomain} = ${websiteDomain}`, true, r.id, r.name, 85);
            return {
              matched: true,
              restaurantId: r.id,
              restaurantName: r.name,
              confidence: 85,
              matchMethod: 'domain_match',
              attempts,
            };
          }
        }
      }
      recordAttempt('domain_match', emailDomain, false);
    }

    // 2d. Email username keywords matching restaurant name
    // e.g., "luckydog@gmail.com" matching "Lucky Dog Cafe"
    const emailKeywords = extractEmailKeywords(customer.email);
    if (emailKeywords.length > 0) {
      const { data: allRestaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('is_active', true);

      if (allRestaurants) {
        let bestMatch: { id: string; name: string; score: number } | null = null;

        for (const r of allRestaurants) {
          const normalizedName = normalizeBusinessName(r.name);
          let matchCount = 0;

          for (const keyword of emailKeywords) {
            if (normalizedName.includes(keyword)) {
              matchCount++;
            }
          }

          if (matchCount > 0) {
            const score = (matchCount / emailKeywords.length) * 75;
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = { id: r.id, name: r.name, score };
            }
          }
        }

        if (bestMatch && bestMatch.score >= 60) {
          recordAttempt('email_keywords', emailKeywords.join(', '), true, bestMatch.id, bestMatch.name, bestMatch.score);
          return {
            matched: true,
            restaurantId: bestMatch.id,
            restaurantName: bestMatch.name,
            confidence: bestMatch.score,
            matchMethod: 'email_keywords',
            attempts,
          };
        }
        recordAttempt('email_keywords', emailKeywords.join(', '), false);
      }
    }
  }

  // ===== LAYER 3: Phone matching =====

  if (customer.phone) {
    const normalizedPhone = normalizePhone(customer.phone);
    if (normalizedPhone) {
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name, phone')
        .not('phone', 'is', null);

      if (restaurants) {
        for (const r of restaurants) {
          if (phonesMatch(customer.phone, r.phone)) {
            recordAttempt('phone_match', normalizedPhone, true, r.id, r.name, 80);
            return {
              matched: true,
              restaurantId: r.id,
              restaurantName: r.name,
              confidence: 80,
              matchMethod: 'phone_match',
              attempts,
            };
          }
        }
      }
      recordAttempt('phone_match', normalizedPhone, false);
    }
  }

  // ===== LAYER 4: Name matching (fuzzy) =====

  const businessName = customer.metadata?.business_name || customer.name;
  if (businessName) {
    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('is_active', true);

    if (restaurants) {
      let bestMatch: { id: string; name: string; score: number } | null = null;

      for (const r of restaurants) {
        const score = namesMatch(businessName, r.name);
        if (score >= 70 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: r.id, name: r.name, score };
        }
      }

      if (bestMatch) {
        recordAttempt('name_fuzzy', businessName, true, bestMatch.id, bestMatch.name, bestMatch.score);
        return {
          matched: true,
          restaurantId: bestMatch.id,
          restaurantName: bestMatch.name,
          confidence: bestMatch.score,
          matchMethod: 'name_fuzzy',
          attempts,
        };
      }
      recordAttempt('name_fuzzy', businessName, false);
    }
  }

  // ===== No match found =====
  return {
    matched: false,
    restaurantId: null,
    restaurantName: null,
    confidence: 0,
    matchMethod: null,
    attempts,
  };
}

/**
 * Log an unmatched subscription for admin review
 */
export async function logUnmatchedSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  customer: StripeCustomerInfo,
  amountCents: number,
  billingInterval: string,
  attempts: MatchAttempt[]
): Promise<void> {
  await supabase.from('unmatched_subscriptions').upsert({
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customer.customerId,
    customer_email: customer.email,
    customer_name: customer.name || customer.metadata?.business_name,
    customer_phone: customer.phone,
    business_name: customer.metadata?.business_name,
    amount_cents: amountCents,
    billing_interval: billingInterval,
    match_attempts: attempts,
    status: 'pending',
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'stripe_subscription_id',
  });
}

/**
 * Mark a subscription as matched (when admin manually matches or auto-match succeeds)
 */
export async function markSubscriptionMatched(
  supabase: SupabaseClient,
  subscriptionId: string,
  restaurantId: string,
  matchedBy: string = 'auto'
): Promise<void> {
  await supabase
    .from('unmatched_subscriptions')
    .update({
      status: 'matched',
      matched_restaurant_id: restaurantId,
      matched_at: new Date().toISOString(),
      matched_by: matchedBy,
    })
    .eq('stripe_subscription_id', subscriptionId);
}
