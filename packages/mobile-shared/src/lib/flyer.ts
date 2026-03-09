/**
 * Flyer Scanner API Service
 * Handles all flyer-related API calls for scanning, extraction, and publishing
 */

import { getSupabase, getBrand } from '../config/theme';

const API_BASE = 'https://tastelanc.com/api/mobile/flyer';

// Type defined here to avoid coupling to app navigation types
export interface ExtractedEventData {
  event_name: string | null;
  venue_name: string | null;
  date: string | null;
  time_start: string | null;
  time_end: string | null;
  description: string | null;
  performers: string | null;
  ticket_link: string | null;
  category: string | null;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No active session');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

async function getAuthToken(): Promise<string> {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No active session');
  }
  return session.access_token;
}

// Resolve market_id from market slug
let cachedMarketId: string | null = null;
export async function getMarketId(): Promise<string> {
  if (cachedMarketId) return cachedMarketId;
  const supabase = getSupabase();
  const brand = getBrand();
  const { data, error } = await supabase
    .from('markets')
    .select('id')
    .eq('slug', brand.marketSlug)
    .eq('is_active', true)
    .single();
  if (error || !data) throw new Error(`Market "${brand.marketSlug}" not found`);
  cachedMarketId = data.id;
  return data.id;
}

// ============================================================
// Extract event data from flyer image
// ============================================================
export interface ExtractResponse {
  flyer_image_url: string;
  extracted: ExtractedEventData;
}

export async function extractFromFlyer(imageUri: string): Promise<ExtractResponse> {
  const token = await getAuthToken();
  const marketId = await getMarketId();

  // Build FormData with the image
  const formData = new FormData();

  const filename = imageUri.split('/').pop() || 'flyer.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as unknown as Blob);
  formData.append('market_id', marketId);

  const response = await fetch(`${API_BASE}/extract`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Extraction failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Match venue name to existing restaurant
// ============================================================
export interface VenueMatch {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  confidence: number;
}

export interface MatchVenueResponse {
  matches: VenueMatch[];
  auto_matched: boolean;
  auto_matched_venue: VenueMatch | null;
}

export async function matchVenue(venueName: string): Promise<MatchVenueResponse> {
  const headers = await getAuthHeaders();
  const marketId = await getMarketId();

  const response = await fetch(`${API_BASE}/match-venue`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ venue_name: venueName, market_id: marketId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Venue match failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Check for duplicate events
// ============================================================
export interface DuplicateCheckResponse {
  is_duplicate: boolean;
  existing_event?: {
    id: string;
    name: string;
    event_date: string;
    start_time: string;
    image_url: string;
  };
}

export async function checkDuplicate(params: {
  venueId: string | null;
  eventDate: string;
  eventName: string;
}): Promise<DuplicateCheckResponse> {
  const headers = await getAuthHeaders();
  const marketId = await getMarketId();

  const response = await fetch(`${API_BASE}/check-duplicate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      venue_id: params.venueId,
      event_date: params.eventDate,
      event_name: params.eventName,
      market_id: marketId,
    }),
  });

  if (!response.ok) {
    return { is_duplicate: false };
  }

  return response.json();
}

// ============================================================
// Create draft + choose publishing path
// ============================================================
export interface CreateDraftParams {
  flyerImageUrl: string;
  extractedJson: ExtractedEventData;
  editedJson: Record<string, unknown>;
  matchedVenueId: string | null;
  publishingPath: 'venue_free' | 'promoter_paid' | 'send_to_organizer';
}

export interface CreateDraftResponse {
  draft_id: string;
  status: string;
  event_id?: string;
  claim_token?: string;
  claim_url?: string;
  error?: string;
}

export async function createDraft(params: CreateDraftParams): Promise<CreateDraftResponse> {
  const headers = await getAuthHeaders();
  const marketId = await getMarketId();

  const response = await fetch(`${API_BASE}/draft`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      flyer_image_url: params.flyerImageUrl,
      extracted_json: params.extractedJson,
      edited_json: params.editedJson,
      matched_venue_id: params.matchedVenueId,
      publishing_path: params.publishingPath,
      market_id: marketId,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Draft creation failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Create Stripe checkout for paid promotion
// ============================================================
export interface CheckoutResponse {
  checkout_url: string;
}

export async function createCheckout(draftId: string): Promise<CheckoutResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ draft_id: draftId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Checkout creation failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================
// Get scanner rewards balance
// ============================================================
export interface ScannerRewardsResponse {
  earned_credits: number;
  pending_credits: number;
  redeemed_credits: number;
  available_credits: number;
  rewards: Array<{
    id: string;
    amount_credits: number;
    status: string;
    created_at: string;
  }>;
}

export async function getScannerRewards(): Promise<ScannerRewardsResponse> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/rewards`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error('Failed to fetch scanner rewards');
  }

  return response.json();
}
