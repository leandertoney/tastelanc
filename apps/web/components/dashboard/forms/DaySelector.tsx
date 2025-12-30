'use client';

import { cn } from '@/lib/utils';
import { DayOfWeek, DAYS_ORDERED, DAY_QUICK_SELECTS } from './types';

interface DaySelectorProps {
  value: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  showQuickSelects?: boolean;
  className?: string;
}

export default function DaySelector({
  value,
  onChange,
  showQuickSelects = true,
  className,
}: DaySelectorProps) {
  const toggleDay = (day: DayOfWeek) => {
    if (value.includes(day)) {
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  };

  const applyQuickSelect = (days: DayOfWeek[]) => {
    // If already selected, clear. Otherwise, set.
    const isAlreadySelected = days.every((d) => value.includes(d)) &&
                               value.length === days.length;
    onChange(isAlreadySelected ? [] : days);
  };

  const isQuickSelectActive = (days: DayOfWeek[]) => {
    return days.every((d) => value.includes(d)) && value.length === days.length;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Quick Selects */}
      {showQuickSelects && (
        <div className="flex flex-wrap gap-2">
          {DAY_QUICK_SELECTS.map((qs) => (
            <button
              key={qs.label}
              type="button"
              onClick={() => applyQuickSelect(qs.days)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200',
                isQuickSelectActive(qs.days)
                  ? 'bg-lancaster-gold/20 text-lancaster-gold border border-lancaster-gold/50'
                  : 'bg-tastelanc-surface/50 text-gray-400 hover:text-white border border-transparent'
              )}
            >
              {qs.label}
            </button>
          ))}
        </div>
      )}

      {/* Day Pills */}
      <div className="flex flex-wrap gap-2">
        {DAYS_ORDERED.map((day) => {
          const isSelected = value.includes(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium capitalize transition-all duration-200',
                'min-w-[52px] active:scale-95',
                isSelected
                  ? 'bg-lancaster-gold text-black shadow-lg shadow-lancaster-gold/20'
                  : 'bg-tastelanc-surface text-gray-400 hover:text-white hover:bg-tastelanc-surface-light'
              )}
            >
              {day.slice(0, 3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
