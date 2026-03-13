export interface SwipeQuestion {
  id: string;
  statement: string;
  answer: boolean;
  restaurantName: string;
  category: QuestionCategory;
  explanation: string;
  imageUrl: string | null;
}

export type QuestionCategory =
  | 'happy_hour'
  | 'special'
  | 'event'
  | 'vibe'
  | 'cuisine';

export type GamePhase = 'start' | 'playing' | 'result';

export interface GameState {
  phase: GamePhase;
  questions: SwipeQuestion[];
  currentIndex: number;
  answers: boolean[]; // true = user got it correct
}

export type ScoreTier = 'rookie' | 'local' | 'foodie' | 'legend';

export interface GameResult {
  score: number;
  total: number;
  tier: ScoreTier;
}

export function getScoreTier(score: number): ScoreTier {
  if (score >= 9) return 'legend';
  if (score >= 7) return 'foodie';
  if (score >= 4) return 'local';
  return 'rookie';
}

export const TIER_CONFIG: Record<ScoreTier, { label: string; emoji: string }> = {
  rookie: { label: 'Rookie', emoji: '🍴' },
  local: { label: 'Local', emoji: '⭐' },
  foodie: { label: 'Foodie', emoji: '🔥' },
  legend: { label: 'Legend', emoji: '👑' },
};
