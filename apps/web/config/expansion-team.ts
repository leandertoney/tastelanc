// Expansion team roster — defines who receives review emails
// and who counts toward consensus on expansion cities.

export interface TeamMember {
  name: string;
  workEmail: string;      // to: address for review emails
  personalEmail: string;  // cc: address
  role: string;
}

export const EXPANSION_TEAM: TeamMember[] = [
  {
    name: 'Leander',
    workEmail: 'leander@tastelanc.com',
    personalEmail: 'leandertoney@gmail.com',
    role: 'Founder',
  },
  {
    name: 'Jordan',
    workEmail: 'jordan@tastelanc.com',
    personalEmail: 'jmtoney1987@gmail.com',
    role: 'Co-Founder',
  },
];

export type ReviewVote = 'interested' | 'not_now' | 'reject';
export type ReviewStatus =
  | 'pending_review'
  | 'consensus_interested'
  | 'consensus_not_now'
  | 'split_decision'
  | 'consensus_reject';

interface VoteRecord {
  reviewer_email: string;
  vote: ReviewVote;
}

/**
 * Calculate team consensus from individual votes.
 * Returns the new review_status and optional priority adjustment.
 */
export function calculateConsensus(
  votes: VoteRecord[]
): { status: ReviewStatus; priorityDelta: number } {
  const teamSize = EXPANSION_TEAM.length;
  const teamVotes = votes.filter(v =>
    EXPANSION_TEAM.some(m => m.workEmail === v.reviewer_email)
  );

  // Not everyone has voted yet
  if (teamVotes.length < teamSize) {
    return { status: 'pending_review', priorityDelta: 0 };
  }

  const allSame = teamVotes.every(v => v.vote === teamVotes[0].vote);

  if (allSame) {
    switch (teamVotes[0].vote) {
      case 'interested':
        return { status: 'consensus_interested', priorityDelta: 3 };
      case 'not_now':
        return { status: 'consensus_not_now', priorityDelta: -3 };
      case 'reject':
        return { status: 'consensus_reject', priorityDelta: -10 };
    }
  }

  // Mixed votes — flag for discussion
  return { status: 'split_decision', priorityDelta: 0 };
}

/** Find team member by work email */
export function getTeamMember(workEmail: string): TeamMember | undefined {
  return EXPANSION_TEAM.find(m => m.workEmail === workEmail);
}
