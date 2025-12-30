'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Check, PartyPopper, Plus, ArrowRight } from 'lucide-react';

interface SuccessCelebrationProps {
  title: string;
  subtitle?: string;
  onContinue: () => void;
  onAddAnother?: () => void;
  continueLabel?: string;
  addAnotherLabel?: string;
  className?: string;
}

// Generate random confetti pieces
function generateConfetti(count: number) {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 1,
    color: ['#D4AF37', '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'][
      Math.floor(Math.random() * 5)
    ],
    rotation: Math.random() * 360,
    size: 6 + Math.random() * 6,
  }));
}

export default function SuccessCelebration({
  title,
  subtitle,
  onContinue,
  onAddAnother,
  continueLabel = 'Done',
  addAnotherLabel = 'Add Another',
  className,
}: SuccessCelebrationProps) {
  const [confetti, setConfetti] = useState<ReturnType<typeof generateConfetti>>([]);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Generate confetti on mount
    setConfetti(generateConfetti(30));

    // Show content after a brief delay
    const timer = setTimeout(() => setShowContent(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn('relative text-center py-8', className)}>
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece) => (
          <div
            key={piece.id}
            className="absolute top-0 animate-confetti-fall"
            style={{
              left: `${piece.left}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          >
            <div
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          </div>
        ))}
      </div>

      {/* Success Icon */}
      <div
        className={cn(
          'relative mx-auto w-20 h-20 mb-6',
          showContent && 'animate-celebration-pop'
        )}
      >
        <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
        <div className="relative w-full h-full bg-green-500 rounded-full flex items-center justify-center">
          <Check className="w-10 h-10 text-white" />
        </div>
      </div>

      {/* Text */}
      <div
        className={cn(
          'space-y-2 transition-all duration-500',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          {title}
          <PartyPopper className="w-6 h-6 text-lancaster-gold" />
        </h3>
        {subtitle && (
          <p className="text-gray-400">{subtitle}</p>
        )}
      </div>

      {/* Actions */}
      <div
        className={cn(
          'flex items-center justify-center gap-3 mt-8 transition-all duration-500 delay-300',
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}
      >
        {onAddAnother && (
          <button
            type="button"
            onClick={onAddAnother}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-lg',
              'bg-tastelanc-surface text-white',
              'hover:bg-tastelanc-surface-light',
              'transition-colors'
            )}
          >
            <Plus className="w-4 h-4" />
            {addAnotherLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg',
            'bg-lancaster-gold text-black font-medium',
            'hover:bg-lancaster-gold/90',
            'transition-colors'
          )}
        >
          {continueLabel}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
