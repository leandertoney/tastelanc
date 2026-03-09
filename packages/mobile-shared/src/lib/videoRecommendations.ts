/**
 * Video Recommendations — upload, thumbnail generation, and helper utilities.
 *
 * Videos are stored in Supabase Storage under `recommendation-videos/{user_id}/{uuid}.mp4`.
 * Thumbnails stored under `recommendation-videos/{user_id}/{uuid}_thumb.jpg`.
 */
import { getSupabase } from '../config/theme';
import type { CaptionTag, VideoRecommendation } from '../types/database';

const BUCKET = 'recommendation-videos';
const MAX_DURATION_SECONDS = 30;
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
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  captionTag: CaptionTag | null;
  durationSeconds: number;
}): Promise<VideoRecommendation> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('restaurant_recommendations')
    .insert({
      user_id: params.userId,
      restaurant_id: params.restaurantId,
      market_id: params.marketId,
      video_url: params.videoUrl,
      thumbnail_url: params.thumbnailUrl,
      caption: params.caption?.trim().slice(0, MAX_CAPTION_LENGTH) || null,
      caption_tag: params.captionTag,
      duration_seconds: Math.min(params.durationSeconds, MAX_DURATION_SECONDS),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create recommendation: ${error.message}`);
  return data as VideoRecommendation;
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
