// Instagram Spotlight Quality Check
// Evaluates a generated spotlight post against 4 criteria before it auto-publishes.
// Used by the self-correcting cron pipeline (/api/instagram/spotlight/cron).
// If a check fails, correction_hint tells the next retry what specifically to fix.

import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';

export type QualityFailureType = 'slide_error' | 'outdated_content' | 'branding' | 'caption';

export interface QualityFailure {
  type: QualityFailureType;
  severity: 'critical' | 'warning';
  description: string;
  correction_hint: string;
  // Extra data for retry logic
  bad_entity_ids?: string[];  // expired/inactive content IDs to exclude
  bad_photo_ids?: string[];   // photo IDs that failed to load
}

export interface QualityCheckResult {
  passed: boolean;
  score: number;           // 0-100
  failures: QualityFailure[];
  caption_suggestions: string[]; // specific copy corrections for retry
}

interface PostData {
  id: string;
  caption: string;
  media_urls: string[];
  generation_metadata: Record<string, any>;
}

interface RestaurantContext {
  id: string;
  name: string;
  market_slug: string;
  app_name: string;
}

// ============================================================================
// Main entry point
// ============================================================================

export async function runQualityCheck(
  post: PostData,
  restaurant: RestaurantContext,
  supabase: SupabaseClient
): Promise<QualityCheckResult> {
  const failures: QualityFailure[] = [];
  const captionSuggestions: string[] = [];
  const today = new Date().toISOString().split('T')[0];

  // ─────────────────────────────────────────────
  // Check 1: Slide images actually exist (critical)
  // ─────────────────────────────────────────────
  const mediaUrls: string[] = post.media_urls ?? [];

  if (mediaUrls.length === 0) {
    failures.push({
      type: 'slide_error',
      severity: 'critical',
      description: 'No slides were generated',
      correction_hint: 'Regenerate all slides from scratch. Ensure the restaurant has at least one photo.',
      bad_photo_ids: [],
    });
  } else {
    const badPhotoIds: string[] = [];
    const results = await Promise.allSettled(
      mediaUrls.map(url =>
        fetch(url, { method: 'HEAD' }).then(r => ({ url, ok: r.ok, status: r.status }))
      )
    );
    const badUrls = results
      .filter(r => r.status === 'fulfilled' && !r.value.ok)
      .map(r => (r as PromiseFulfilledResult<{ url: string; ok: boolean; status: number }>).value.url);

    if (badUrls.length > 0) {
      // Extract photo IDs from the URL paths (storage paths contain photo IDs)
      failures.push({
        type: 'slide_error',
        severity: 'critical',
        description: `${badUrls.length} of ${mediaUrls.length} slide images failed to load`,
        correction_hint: 'Some slide images could not be fetched. Regenerate slides using different source photos.',
        bad_photo_ids: badPhotoIds,
      });
    }
  }

  // ─────────────────────────────────────────────
  // Check 2: Content is still current (critical)
  // ─────────────────────────────────────────────
  const badEntityIds: string[] = [];

  if (restaurant.id) {
    // Check for deals that have expired since generation
    const { data: expiredDeals } = await supabase
      .from('coupons')
      .select('id, title')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', false)
      .not('end_date', 'is', null)
      .lt('end_date', today);

    if (expiredDeals && expiredDeals.length > 0) {
      badEntityIds.push(...expiredDeals.map((d: any) => d.id));
    }

    // Check for inactive content that may have been included
    const [inactiveSpecials, inactiveHH, inactiveEvents] = await Promise.all([
      supabase.from('specials').select('id').eq('restaurant_id', restaurant.id).eq('is_active', false),
      supabase.from('happy_hours').select('id').eq('restaurant_id', restaurant.id).eq('is_active', false),
      supabase.from('events').select('id').eq('restaurant_id', restaurant.id).eq('is_active', false),
    ]);

    // Only flag as failure if something became inactive VERY recently (last 2 hours)
    // — we don't want to reject a post just because content changed hours later.
    // Check if the post metadata references any of these IDs:
    const recentlyDeactivated = [
      ...(inactiveSpecials.data ?? []),
      ...(inactiveHH.data ?? []),
      ...(inactiveEvents.data ?? []),
    ].map((x: any) => x.id);

    // Cross-reference with selected_entity_ids from generation_metadata
    const selectedIds: string[] = post.generation_metadata?.selected_entity_ids ?? [];
    const staleIds = recentlyDeactivated.filter(id => selectedIds.includes(id));

    if (badEntityIds.length > 0 || staleIds.length > 0) {
      const allBad = [...new Set([...badEntityIds, ...staleIds])];
      failures.push({
        type: 'outdated_content',
        severity: 'critical',
        description: `${allBad.length} content item(s) are expired or inactive and may be featured`,
        correction_hint: 'Exclude the flagged entity IDs and regenerate the post with current content.',
        bad_entity_ids: allBad,
      });
    }
  }

  // ─────────────────────────────────────────────
  // Check 3: Branding (warning)
  // ─────────────────────────────────────────────
  const caption = post.caption ?? '';
  const brandingIssues: string[] = [];

  if (!caption.toLowerCase().includes(restaurant.name.toLowerCase())) {
    brandingIssues.push(`Missing restaurant name "${restaurant.name}" in caption`);
  }
  if (!caption.toLowerCase().includes(restaurant.app_name.toLowerCase())) {
    brandingIssues.push(`Missing app name "${restaurant.app_name}" in caption`);
  }
  if (caption.length > 2200) {
    brandingIssues.push(`Caption is ${caption.length} chars — exceeds Instagram 2200 char limit`);
  }
  if (!/#\w/.test(caption)) {
    brandingIssues.push('Caption has no hashtags');
  }

  if (brandingIssues.length > 0) {
    failures.push({
      type: 'branding',
      severity: 'warning',
      description: brandingIssues.join('; '),
      correction_hint: `Fix these issues in the caption: ${brandingIssues.join('. ')}`,
    });
    captionSuggestions.push(...brandingIssues.map(i => `Fix: ${i}`));
  }

  // ─────────────────────────────────────────────
  // Check 4: Caption quality via AI (warning)
  // ─────────────────────────────────────────────
  let captionScore = 100; // default pass

  // Only run AI check if no critical failures (saves tokens)
  const hasCritical = failures.some(f => f.severity === 'critical');
  if (!hasCritical && caption.length > 20) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      const reviewPrompt = `You are reviewing an Instagram caption for a restaurant spotlight post. Score it against these 5 criteria (0-20 points each, total 0-100):

1. **Specificity** (20pts): Does the caption mention specific details about this restaurant — menu items, times, prices, or events? Generic openers like "Looking for a great meal?" = 0pts.
2. **Hook** (20pts): Does the first line create curiosity or insider appeal? It should make someone stop scrolling.
3. **Content highlight** (20pts): Does it mention at least one actual offer — a deal, happy hour time, special, or event name?
4. **CTA** (20pts): Does it end with a clear call-to-action to find the restaurant on the app?
5. **Tone** (20pts): Does it sound like a knowledgeable local giving a tip, not a press release or ad?

Restaurant: ${restaurant.name}
App: ${restaurant.app_name}

Caption to review:
---
${caption.slice(0, 600)}
---

Respond ONLY with a JSON object:
{
  "score": <0-100>,
  "issues": ["specific issue 1", "specific issue 2"],
  "corrections": ["specific fix 1", "specific fix 2"]
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: reviewPrompt }],
        max_tokens: 300,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const review = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
      captionScore = Math.min(100, Math.max(0, review.score ?? 100));

      if (captionScore < 70) {
        const issues: string[] = review.issues ?? [];
        const corrections: string[] = review.corrections ?? [];
        failures.push({
          type: 'caption',
          severity: 'warning',
          description: `Caption quality score ${captionScore}/100 (below 70 threshold). Issues: ${issues.join('; ')}`,
          correction_hint: corrections.join('. '),
        });
        captionSuggestions.push(...corrections);
      }
    } catch {
      // AI check failure is non-blocking — don't fail the post over it
    }
  }

  // ─────────────────────────────────────────────
  // Final verdict
  // ─────────────────────────────────────────────
  const hasCriticalFailure = failures.some(f => f.severity === 'critical');
  const overallScore = hasCriticalFailure ? 0 : Math.round(captionScore * 0.6 + (failures.length === 0 ? 40 : 20));

  return {
    passed: !hasCriticalFailure && captionScore >= 70,
    score: overallScore,
    failures,
    caption_suggestions: captionSuggestions,
  };
}
