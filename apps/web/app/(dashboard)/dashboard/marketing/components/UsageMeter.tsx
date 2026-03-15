'use client';

interface UsageMeterProps {
  used: number;
  limit: number;
  label: string;
}

export default function UsageMeter({ used, limit, label }: UsageMeterProps) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isAtLimit = used >= limit;

  return (
    <div className="bg-tastelanc-surface-light rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-tastelanc-text-muted">{label}</span>
        <span className={`text-sm font-medium ${isAtLimit ? 'text-red-400' : 'text-tastelanc-text-primary'}`}>
          {used} / {limit}
        </span>
      </div>
      <div className="w-full bg-tastelanc-surface rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isAtLimit ? 'bg-red-500' : percentage >= 75 ? 'bg-yellow-500' : 'bg-tastelanc-accent'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-400 mt-2">
          Limit reached. Resets next month.
        </p>
      )}
    </div>
  );
}
