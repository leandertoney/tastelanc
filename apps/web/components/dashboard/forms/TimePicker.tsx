'use client';

import { cn } from '@/lib/utils';
import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { generateTimeSlots, formatTimeDisplay, TIME_PRESETS, TimeSlot } from './types';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label?: string;
  showPresets?: boolean;
  minTime?: string;
  maxTime?: string;
  className?: string;
}

export default function TimePicker({
  value,
  onChange,
  label,
  showPresets = true,
  minTime,
  maxTime,
  className,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  // Generate time slots
  const timeSlots = generateTimeSlots(6, 24, 30);

  // Filter by min/max if provided
  const filteredSlots = timeSlots.filter((slot) => {
    if (minTime && slot.value < minTime) return false;
    if (maxTime && slot.value > maxTime) return false;
    return true;
  });

  // Scroll to selected time when opened
  useEffect(() => {
    if (isOpen && selectedRef.current) {
      selectedRef.current.scrollIntoView({
        block: 'center',
        behavior: 'instant',
      });
    }
  }, [isOpen]);

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

  const handleSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-tastelanc-bg border border-tastelanc-surface-light rounded-xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Presets */}
          {showPresets && (
            <div className="p-3 border-b border-tastelanc-surface-light">
              <p className="text-xs text-gray-500 mb-2">Quick picks</p>
              <div className="flex flex-wrap gap-2">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelect(preset.time)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      value === preset.time
                        ? 'bg-lancaster-gold text-black'
                        : 'bg-tastelanc-surface text-gray-400 hover:text-white'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time Grid */}
          <div className="p-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-4 gap-1">
              {filteredSlots.map((slot) => {
                const isSelected = value === slot.value;

                return (
                  <button
                    key={slot.value}
                    ref={isSelected ? selectedRef : undefined}
                    type="button"
                    onClick={() => handleSelect(slot.value)}
                    className={cn(
                      'px-2 py-2 rounded-lg text-sm transition-all',
                      isSelected
                        ? 'bg-lancaster-gold text-black font-medium'
                        : 'text-gray-300 hover:bg-tastelanc-surface hover:text-white'
                    )}
                  >
                    {slot.display}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
