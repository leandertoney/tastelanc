// Spotlight Pipeline Outcome Logger
// Records the result of each automated spotlight run to notification_logs.
// job_type = 'spotlight_pipeline' — shows up in any existing monitoring that reads that table.
// No new table needed.

import { SupabaseClient } from '@supabase/supabase-js';

export interface SpotlightOutcome {
  market_slug: string;
  tier: 'elite' | 'premium';
  restaurant_name: string | null;
  restaurant_id: string | null;
  outcome: 'scheduled' | 'abandoned';
  retry_count: number;
  failure_reasons: string[];
  post_id: string | null;
  post_date: string; // YYYY-MM-DD
}

export async function logSpotlightOutcome(
  supabase: SupabaseClient,
  opts: SpotlightOutcome
): Promise<void> {
  const { error } = await supabase.from('notification_logs').insert({
    job_type: 'spotlight_pipeline',
    status: opts.outcome === 'scheduled' ? 'success' : 'error',
    details: {
      market_slug: opts.market_slug,
      tier: opts.tier,
      restaurant_name: opts.restaurant_name,
      restaurant_id: opts.restaurant_id,
      outcome: opts.outcome,
      retry_count: opts.retry_count,
      failure_reasons: opts.failure_reasons,
      post_id: opts.post_id,
      post_date: opts.post_date,
      pipeline_version: 'v1',
    },
  });

  if (error) {
    // Non-fatal — don't throw, just log
    console.error('[SpotlightSummary] Failed to log outcome:', error.message);
  }
}
