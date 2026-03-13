'use client';

interface ProgressBarProps {
  total: number;
  current: number;
  answers: boolean[]; // true = correct, false = incorrect
}

export function ProgressBar({ total, current, answers }: ProgressBarProps) {
  return (
    <div className="flex gap-1.5 w-full max-w-xs mx-auto">
      {Array.from({ length: total }).map((_, i) => {
        let color = 'bg-white/20'; // upcoming
        if (i < answers.length) {
          color = answers[i] ? 'bg-green-500' : 'bg-red-500';
        } else if (i === current) {
          color = 'bg-white/60'; // current
        }
        return (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${color}`}
          />
        );
      })}
    </div>
  );
}
