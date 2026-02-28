/**
 * Lead aging helper for ownership enforcement.
 *
 * Rules:
 * - 7+ days since last status change → "needs follow-up" nudge
 * - 14+ days since last status change → lead becomes claimable by other reps
 */

export interface LeadAge {
  daysSinceUpdate: number;
  isNudge: boolean;   // 7+ days
  isStale: boolean;   // 14+ days
}

const NUDGE_DAYS = 7;
const STALE_DAYS = 14;

export function getLeadAge(lead: {
  updated_at?: string;
  created_at: string;
}): LeadAge {
  const referenceDate = lead.updated_at || lead.created_at;
  const diff = Date.now() - new Date(referenceDate).getTime();
  const daysSinceUpdate = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    daysSinceUpdate,
    isNudge: daysSinceUpdate >= NUDGE_DAYS,
    isStale: daysSinceUpdate >= STALE_DAYS,
  };
}

export { NUDGE_DAYS, STALE_DAYS };
