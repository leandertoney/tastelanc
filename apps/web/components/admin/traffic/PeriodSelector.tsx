'use client';

type Period = 'today' | '7d' | '30d' | 'all';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All Time' },
];

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex bg-tastelanc-surface rounded-lg p-1 gap-0.5">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === p.value
              ? 'bg-tastelanc-accent text-white font-medium'
              : 'text-tastelanc-text-muted hover:text-tastelanc-text-primary'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
