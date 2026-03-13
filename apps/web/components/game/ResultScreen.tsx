'use client';

import { motion } from 'framer-motion';
import { BRAND } from '@/config/market';
import { getScoreTier, TIER_CONFIG } from '@/lib/game/types';
import { DownloadButtons } from '@/components/ui/DownloadButtons';

interface ResultScreenProps {
  score: number;
  total: number;
  onPlayAgain: () => void;
}

export function ResultScreen({ score, total, onPlayAgain }: ResultScreenProps) {
  const tier = getScoreTier(score);
  const { label, emoji } = TIER_CONFIG[tier];
  const percentage = Math.round((score / total) * 100);

  async function handleShare() {
    const text = `I scored ${score}/${total} on "How well do you know ${BRAND.countyShort}?" ${emoji}`;
    const url = `${window.location.origin}/play?score=${score}&total=${total}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${BRAND.name} Food Challenge`, text, url });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      alert('Copied to clipboard!');
    } catch {
      // Ignore clipboard errors
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 text-center">
      {/* Score ring */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative w-40 h-40 mb-6"
      >
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          <motion.circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            className="text-tastelanc-accent"
            strokeDasharray={`${2 * Math.PI * 42}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - percentage / 100) }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{score}/{total}</span>
        </div>
      </motion.div>

      {/* Tier */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <span className="text-5xl mb-2 block">{emoji}</span>
        <h2 className="text-3xl font-serif font-bold text-white mb-2">{label}</h2>
        <p className="text-white/50 mb-8">
          {tier === 'legend' && "You really know your stuff!"}
          {tier === 'foodie' && "Not bad — you know the scene!"}
          {tier === 'local' && "You've got some exploring to do."}
          {tier === 'rookie' && "Time to get out there and eat!"}
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button
          onClick={handleShare}
          className="bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white font-bold text-lg px-8 py-4 rounded-full transition-colors w-full"
        >
          Share Your Score
        </button>

        <button
          onClick={onPlayAgain}
          className="bg-white/10 hover:bg-white/20 text-white font-semibold text-lg px-8 py-4 rounded-full transition-colors w-full"
        >
          Play Again
        </button>
      </motion.div>

      {/* Download CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-10 pt-8 border-t border-white/10 w-full max-w-xs"
      >
        <p className="text-white/40 text-sm mb-4">Find happy hours, specials & events near you</p>
        <DownloadButtons variant="full" />
      </motion.div>
    </div>
  );
}
