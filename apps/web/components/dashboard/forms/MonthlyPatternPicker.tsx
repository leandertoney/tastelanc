'use client';

import { cn } from '@/lib/utils';
import type { DayOfWeek } from './types';

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'sunday', label: 'Sun' },
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
];

const WEEKS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: 5, label: '5th' },
];

interface PatternEntry {
  week: number;
  day: string;
}

interface MonthlyPatternPickerProps {
  value: PatternEntry[];
  onChange: (pattern: PatternEntry[]) => void;
  className?: string;
}

export default function MonthlyPatternPicker({
  value,
  onChange,
  className,
}: MonthlyPatternPickerProps) {
  const isSelected = (week: number, day: string) =>
    value.some(p => p.week === week && p.day === day);

  const toggle = (week: number, day: string) => {
    if (isSelected(week, day)) {
      onChange(value.filter(p => !(p.week === week && p.day === day)));
    } else {
      onChange([...value, { week, day }]);
    }
  };

  const summary = (() => {
    if (value.length === 0) return null;
    const grouped = new Map<string, number[]>();
    for (const { week, day } of value) {
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day)!.push(week);
    }
    const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th'];
    const parts: string[] = [];
    for (const [day, weeks] of grouped.entries()) {
      weeks.sort((a, b) => a - b);
      const abbr = day.charAt(0).toUpperCase() + day.slice(1, 3);
      parts.push(`${weeks.map(w => ordinals[w]).join(' & ')} ${abbr}`);
    }
    return `Every ${parts.join(', ')}`;
  })();

  return (
    <div className={cn('space-y-3', className)}>
      {/* Grid: rows = weeks, columns = days */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-12" />
              {DAYS.map(d => (
                <th
                  key={d.key}
                  className="px-1 py-1 text-[10px] font-medium text-tastelanc-text-muted text-center uppercase tracking-wide"
                >
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKS.map(w => (
              <tr key={w.value}>
                <td className="pr-2 py-1 text-[11px] font-medium text-tastelanc-text-muted text-right whitespace-nowrap">
                  {w.label}
                </td>
                {DAYS.map(d => {
                  const selected = isSelected(w.value, d.key);
                  return (
                    <td key={d.key} className="px-1 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(w.value, d.key)}
                        className={cn(
                          'w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95',
                          selected
                            ? 'bg-lancaster-gold text-black shadow-lg shadow-lancaster-gold/20'
                            : 'bg-tastelanc-surface text-tastelanc-text-muted hover:text-tastelanc-text-primary hover:bg-tastelanc-surface-light'
                        )}
                      >
                        {selected ? '✓' : ''}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live summary */}
      {summary && (
        <p className="text-xs text-lancaster-gold/80 font-medium px-1">
          {summary}
        </p>
      )}
    </div>
  );
}
