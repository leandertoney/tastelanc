'use client';

import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { formatTimeDisplay } from './types';

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = ['00', '15', '30', '45'];

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  showPresets?: boolean;
  className?: string;
}

/** Parse a 24h "HH:MM" string into { hour12, minute, period } */
function parse24(value: string) {
  if (!value) return { hour12: 12, minute: '00', period: 'AM' as const };
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? ('PM' as const) : ('AM' as const);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  // Snap minute to nearest option
  const snapped = MINUTES.reduce((prev, cur) =>
    Math.abs(Number(cur) - m) < Math.abs(Number(prev) - m) ? cur : prev
  );
  return { hour12, minute: snapped, period };
}

/** Convert { hour12, minute, period } back to "HH:MM" */
function to24(hour12: number, minute: string, period: 'AM' | 'PM'): string {
  let h = hour12;
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${minute}`;
}

export default function TimePicker({
  value,
  onChange,
  label,
  className,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parse24(value), [value]);
  const [selectedHour, setSelectedHour] = useState(parsed.hour12);
  const [selectedMinute, setSelectedMinute] = useState(parsed.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(parsed.period);

  // Sync local state when value prop changes externally
  useEffect(() => {
    const p = parse24(value);
    setSelectedHour(p.hour12);
    setSelectedMinute(p.minute);
    setSelectedPeriod(p.period);
  }, [value]);

  // Emit change whenever any part changes
  const emitChange = (hour: number, minute: string, period: 'AM' | 'PM') => {
    onChange(to24(hour, minute, period));
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleHour = (h: number) => {
    setSelectedHour(h);
    emitChange(h, selectedMinute, selectedPeriod);
  };

  const handleMinute = (m: string) => {
    setSelectedMinute(m);
    emitChange(selectedHour, m, selectedPeriod);
  };

  const handlePeriod = (p: 'AM' | 'PM') => {
    setSelectedPeriod(p);
    emitChange(selectedHour, selectedMinute, p);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all',
          'bg-tastelanc-surface text-white',
          isOpen
            ? 'border-lancaster-gold ring-2 ring-lancaster-gold/20'
            : 'border-tastelanc-surface-light hover:border-gray-600'
        )}
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>
          {value ? formatTimeDisplay(value) : 'Select time'}
        </span>
        <Clock className="w-5 h-5 text-gray-400" />
      </button>

      {/* Dropdown — 3-column picker */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-tastelanc-bg border border-tastelanc-surface-light rounded-xl shadow-2xl overflow-hidden animate-scale-in">
          <div className="flex divide-x divide-tastelanc-surface-light">
            {/* Hours */}
            <div className="flex-1 max-h-56 overflow-y-auto py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 text-center mb-1">Hr</p>
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHour(h)}
                  className={cn(
                    'w-full py-2 text-center text-sm transition-all',
                    selectedHour === h
                      ? 'bg-lancaster-gold text-black font-semibold'
                      : 'text-gray-300 hover:bg-tastelanc-surface hover:text-white'
                  )}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Minutes */}
            <div className="flex-1 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 text-center mb-1">Min</p>
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMinute(m)}
                  className={cn(
                    'w-full py-2 text-center text-sm transition-all',
                    selectedMinute === m
                      ? 'bg-lancaster-gold text-black font-semibold'
                      : 'text-gray-300 hover:bg-tastelanc-surface hover:text-white'
                  )}
                >
                  :{m}
                </button>
              ))}
            </div>

            {/* AM / PM */}
            <div className="flex-1 py-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 text-center mb-1">&nbsp;</p>
              {(['AM', 'PM'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriod(p)}
                  className={cn(
                    'w-full py-2 text-center text-sm transition-all',
                    selectedPeriod === p
                      ? 'bg-lancaster-gold text-black font-semibold'
                      : 'text-gray-300 hover:bg-tastelanc-surface hover:text-white'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
