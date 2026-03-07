// Instagram Agent v1: Publish to Instagram Graph API
// Uses the Meta Graph API for single-image and carousel posts

import { SupabaseClient } from '@supabase/supabase-js';
import { PublishResult, InstagramAccount } from './types';

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

/**
 * Publish a post to Instagram via the Graph API.
 * Flow for single image:
 *   1. Create media container (POST /{ig-user-id}/media)
 *   2. Publish container (POST /{ig-user-id}/media_publish)
 * Flow for carousel:
 *   1. Create item containers for each image
 *   2. Create carousel container referencing items
 *   3. Publish carousel container
 */
export async function publishToInstagram(
  account: InstagramAccount,
  caption: string,
  mediaUrls: string[]
): Promise<PublishResult> {
  const { instagram_business_account_id: igUserId, access_token_encrypted: accessToken } = account;

  if (!mediaUrls.length) {
    return { success: false, error: 'No media URLs provided' };
  }

  try {
    if (mediaUrls.length === 1) {
      return await publishSingleImage(igUserId, accessToken, caption, mediaUrls[0]);
    } else {
      return await publishCarousel(igUserId, accessToken, caption, mediaUrls);
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function publishSingleImage(
  igUserId: string,
  accessToken: string,
  caption: string,
  imageUrl: string
): Promise<PublishResult> {
  // Step 1: Create media container
  const containerRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  });

  const containerData = await containerRes.json();
  if (containerData.error) {
    throw new Error(`Container creation failed: ${containerData.error.message}`);
  }

  const containerId = containerData.id;

  // Step 2: Wait for processing (poll status)
  await waitForMediaReady(containerId, accessToken);

  // Step 3: Publish
  const publishRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  });

  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(`Publish failed: ${publishData.error.message}`);
  }

  // Get permalink
  const permalink = await getPermalink(publishData.id, accessToken);

  return {
    success: true,
    instagram_media_id: publishData.id,
    permalink,
  };
}

async function publishCarousel(
  igUserId: string,
  accessToken: string,
  caption: string,
  imageUrls: string[]
): Promise<PublishResult> {
  // Step 1: Create item containers
  const itemIds: string[] = [];
  for (const url of imageUrls) {
    const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: url,
        is_carousel_item: true,
        access_token: accessToken,
      }),
    });
    const data = await res.json();
    if (data.error) {
      throw new Error(`Carousel item failed: ${data.error.message}`);
    }
    itemIds.push(data.id);
  }

  // Wait for all items to process
  for (const itemId of itemIds) {
    await waitForMediaReady(itemId, accessToken);
  }

  // Step 2: Create carousel container
  const carouselRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'CAROUSEL',
      children: itemIds,
      caption,
      access_token: accessToken,
    }),
  });

  const carouselData = await carouselRes.json();
  if (carouselData.error) {
    throw new Error(`Carousel container failed: ${carouselData.error.message}`);
  }

  await waitForMediaReady(carouselData.id, accessToken);

  // Step 3: Publish
  const publishRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: carouselData.id,
      access_token: accessToken,
    }),
  });

  const publishData = await publishRes.json();
  if (publishData.error) {
    throw new Error(`Carousel publish failed: ${publishData.error.message}`);
  }

  const permalink = await getPermalink(publishData.id, accessToken);

  return {
    success: true,
    instagram_media_id: publishData.id,
    permalink,
  };
}

/**
 * Poll for media container to be ready (max ~30 seconds)
 */
async function waitForMediaReady(containerId: string, accessToken: string, maxAttempts = 10): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    const data = await res.json();

    if (data.status_code === 'FINISHED') return;
    if (data.status_code === 'ERROR') {
      throw new Error(`Media processing failed for container ${containerId}`);
    }

    // Wait 3 seconds between polls
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  throw new Error(`Media processing timed out for container ${containerId}`);
}

async function getPermalink(mediaId: string, accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${accessToken}`
    );
    const data = await res.json();
    return data.permalink;
  } catch {
    return undefined;
  }
}

/**
 * Update post status and metadata after publish attempt
 */
export async function updatePostAfterPublish(
  supabase: SupabaseClient,
  postId: string,
  result: PublishResult
): Promise<void> {
  if (result.success) {
    await supabase
      .from('instagram_posts')
      .update({
        status: 'published',
        instagram_media_id: result.instagram_media_id,
        instagram_permalink: result.permalink,
        published_at: new Date().toISOString(),
      })
      .eq('id', postId);
  } else {
    await supabase
      .from('instagram_posts')
      .update({
        status: 'failed',
        error_message: result.error,
      })
      .eq('id', postId);
  }
}

/**
 * Refresh a long-lived token before expiry.
 * Long-lived tokens last 60 days. Refresh before they expire.
 */
export async function refreshLongLivedToken(
  account: InstagramAccount
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${account.access_token_encrypted}`
    );
    const data = await res.json();

    if (data.error) {
      console.error('Token refresh failed:', data.error.message);
      return null;
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (err: any) {
    console.error('Token refresh error:', err.message);
    return null;
  }
}

/**
 * Fetch engagement metrics for a published post
 */
export async function fetchPostMetrics(
  account: InstagramAccount,
  instagramMediaId: string
): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${instagramMediaId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${account.access_token_encrypted}`
    );
    const data = await res.json();

    if (data.error) {
      console.error('Metrics fetch failed:', data.error.message);
      return {};
    }

    const metrics: Record<string, number> = {};
    for (const item of data.data || []) {
      metrics[item.name] = item.values?.[0]?.value || 0;
    }
    return metrics;
  } catch (err: any) {
    console.error('Metrics fetch error:', err.message);
    return {};
  }
}
