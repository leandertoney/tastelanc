'use client';

import { useState } from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';

function getScoreBand(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Optimized', color: 'text-green-400 bg-green-500/20' };
  if (score >= 75) return { label: 'Great', color: 'text-blue-400 bg-blue-500/20' };
  if (score >= 55) return { label: 'Good', color: 'text-yellow-400 bg-yellow-500/20' };
  if (score >= 30) return { label: 'Getting Started', color: 'text-orange-400 bg-orange-500/20' };
  return { label: 'Incomplete', color: 'text-red-400 bg-red-500/20' };
}

interface AdminProfileScoreProps {
  restaurantId: string;
  initialScore: number;
  initialUpdatedAt: string | null;
}

export default function AdminProfileScore({
  restaurantId,
  initialScore,
  initialUpdatedAt,
}: AdminProfileScoreProps) {
  const [score, setScore] = useState(initialScore);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const band = getScoreBand(score);

  async function handleRecalculate() {
    setIsRecalculating(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}/recalculate-score`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.profile_score);
        setUpdatedAt(data.profile_score_updated_at);
      }
    } catch (error) {
      console.error('Failed to recalculate score:', error);
    } finally {
      setIsRecalculating(false);
    }
  }

  return (
    <div className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-tastelanc-text-primary flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-tastelanc-accent" />
          Visibility Score
        </h2>
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-tastelanc-text-secondary hover:text-tastelanc-text-primary border border-tastelanc-surface-light rounded-lg hover:bg-tastelanc-surface-light transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          Recalculate
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-tastelanc-text-primary">{score}</div>
        <div>
          <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${band.color}`}>
            {band.label}
          </span>
          {updatedAt && (
            <p className="text-xs text-tastelanc-text-faint mt-1">
              Updated {new Date(updatedAt).toLocaleDateString()} {new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>

      <div className="w-full bg-tastelanc-bg rounded-full h-2 mt-4">
        <div
          className="bg-tastelanc-accent h-2 rounded-full transition-all"
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="text-xs text-tastelanc-text-faint mt-3">
        Score reflects deals, video recs, menu, happy hours, events, photos, and basic info. Higher scores = more visibility in app rotation and search.
      </p>
    </div>
  );
}
