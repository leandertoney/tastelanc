'use client';

import { cn } from '@/lib/utils';
import TimePicker from './TimePicker';
import { ArrowRight } from 'lucide-react';

interface TimeRangePickerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  startLabel?: string;
  endLabel?: string;
  className?: string;
}

export default function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  startLabel = 'Start Time',
  endLabel = 'End Time',
  className,
}: TimeRangePickerProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-4 items-end">
        <TimePicker
          value={startTime}
          onChange={onStartTimeChange}
          label={startLabel}
        />
        <TimePicker
          value={endTime}
          onChange={onEndTimeChange}
          label={endLabel}
        />
      </div>

      {/* Visual indicator */}
      {startTime && endTime && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <span className="text-white font-medium">
            {formatDisplayTime(startTime)}
          </span>
          <ArrowRight className="w-4 h-4 text-lancaster-gold" />
          <span className="text-white font-medium">
            {formatDisplayTime(endTime)}
          </span>
          <span className="text-gray-500 ml-2">
            ({calculateDuration(startTime, endTime)})
          </span>
        </div>
      )}
    </div>
  );
}

function formatDisplayTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${h}:${minutes} ${ampm}`;
}

function calculateDuration(start: string, end: string): string {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  let minutes = (endH * 60 + endM) - (startH * 60 + startM);
  if (minutes < 0) minutes += 24 * 60; // Handle overnight

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}min`;
  if (mins === 0) return `${hours}hr`;
  return `${hours}hr ${mins}min`;
}
