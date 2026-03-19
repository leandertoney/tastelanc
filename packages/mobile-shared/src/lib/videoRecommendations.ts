/**
 * Video Recommendations — upload, thumbnail generation, and helper utilities.
 *
 * Videos are stored in Supabase Storage under `recommendation-videos/{user_id}/{uuid}.mp4`.
 * Thumbnails stored under `recommendation-videos/{user_id}/{uuid}_thumb.jpg`.
 */
import { getSupabase, getAnonKey } from '../config/theme';
import type { CaptionTag, VideoRecommendation, TextOverlay } from '../types/database';

const BUCKET = 'recommendation-videos';
const MAX_DURATION_SECONDS = 60;
const MAX_CAPTION_LENGTH = 120;

export { MAX_DURATION_SECONDS, MAX_CAPTION_LENGTH };

/**
 * Upload a video file to Supabase Storage.
 * Uses FormData for React Native compatibility (blob from fetch on file:// URIs is often empty).
 */
export async function uploadRecommendationVideo(
  userId: string,
  videoUri: string,
): Promise<string> {
  const supabase = getSupabase();
  const fileId = generateId();
  const filePath = `${userId}/${fileId}.mp4`;

  const formData = new FormData();
  formData.append('file', {
    uri: videoUri,
    name: `${fileId}.mp4`,
    type: 'video/mp4',
  } as any);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, formData, {
      contentType: 'multipart/form-data',
      upsert: false,
    });

  if (error) throw new Error(`Video upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return urlData.publicUrl;
}

/**
 * Upload a thumbnail image to Supabase Storage.
 * Uses FormData for React Native compatibility.
 */
export async function uploadRecommendationThumbnail(
  userId: string,
  thumbnailUri: string,
): Promise<string> {
  const supabase = getSupabase();
  const fileId = generateId();
  const filePath = `${userId}/${fileId}_thumb.jpg`;

  const formData = new FormData();
  formData.append('file', {
    uri: thumbnailUri,
    name: `${fileId}_thumb.jpg`,
    type: 'image/jpeg',
  } as any);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, formData, {
      contentType: 'multipart/form-data',
      upsert: false,
    });

  if (error) throw new Error(`Thumbnail upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return urlData.publicUrl;
}

/**
 * Create a recommendation record in the database.
 */
export async function createRecommendation(params: {
  userId: string;
  restaurantId: string;
  marketId: string;
  videoUrls: string[];
  thumbnailUrl: string | null;
  caption: string | null;
  captionTag: CaptionTag | null;
  durationSeconds: number;
  captionsEnabled?: boolean;
  textOverlays?: TextOverlay[];
}): Promise<VideoRecommendation> {
  const supabase = getSupabase();

  // Store as JSON array for multi-segment support; single clips also stored as array
  const videoUrlValue = params.videoUrls.length === 1
    ? params.videoUrls[0]
    : JSON.stringify(params.videoUrls);

  const { data, error } = await supabase
    .from('restaurant_recommendations')
    .insert({
      user_id: params.userId,
      restaurant_id: params.restaurantId,
      market_id: params.marketId,
      video_url: videoUrlValue,
      thumbnail_url: params.thumbnailUrl,
      caption: params.caption?.trim().slice(0, MAX_CAPTION_LENGTH) || null,
      caption_tag: params.captionTag,
      duration_seconds: Math.min(params.durationSeconds, MAX_DURATION_SECONDS),
      is_visible: false, // Hidden until admin approves
      captions_enabled: params.captionsEnabled ?? false,
      text_overlays: params.textOverlays && params.textOverlays.length > 0
        ? params.textOverlays
        : null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create recommendation: ${error.message}`);

  // Fire-and-forget: trigger AI review for Instagram posting pipeline
  triggerAIReview((data as VideoRecommendation).id);

  return data as VideoRecommendation;
}

/**
 * Trigger AI review of a recommendation caption (fire-and-forget).
 * This calls the web API which runs OpenAI moderation and sets ig_status.
 */
function triggerAIReview(recommendationId: string): void {
  try {
    const anonKey = getAnonKey();
    fetch('https://tastelanc.com/api/instagram/review-recommendation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ recommendation_id: recommendationId }),
    }).catch((err) => {
      console.warn('[VideoRecommendations] AI review trigger failed:', err);
    });
  } catch (err) {
    console.warn('[VideoRecommendations] AI review trigger error:', err);
  }
}

/**
 * Parse video_url field — handles both plain URL (legacy) and JSON array (multi-segment).
 */
export function parseVideoUrls(videoUrl: string): string[] {
  if (videoUrl.startsWith('[')) {
    try { return JSON.parse(videoUrl); } catch { return [videoUrl]; }
  }
  return [videoUrl];
}

/**
 * Increment view count for a recommendation.
 */
export async function recordView(recommendationId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.rpc('increment_recommendation_views', { rec_id: recommendationId });
}

/**
 * Toggle like on a recommendation. Returns the new like state.
 */
export async function toggleLike(
  recommendationId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabase();

  // Check if already liked
  const { data: existing } = await supabase
    .from('recommendation_likes')
    .select('id')
    .eq('recommendation_id', recommendationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase
      .from('recommendation_likes')
      .delete()
      .eq('id', existing.id);
    return false;
  } else {
    // Like
    await supabase
      .from('recommendation_likes')
      .insert({ recommendation_id: recommendationId, user_id: userId });
    return true;
  }
}

/**
 * Flag a recommendation for moderation.
 */
export async function flagRecommendation(recommendationId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from('restaurant_recommendations')
    .update({ is_flagged: true })
    .eq('id', recommendationId);
}

/**
 * Delete a recommendation (own content only — RLS enforced).
 */
export async function deleteRecommendation(recommendationId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('restaurant_recommendations')
    .delete()
    .eq('id', recommendationId);
  if (error) throw new Error(`Failed to delete recommendation: ${error.message}`);
}

function generateId(): string {
  return 'xxxxxxxxxxxx'.replace(/x/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  );
}
