'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface QuickSelectOption<T> {
  value: T;
  label: string;
  icon?: LucideIcon;
  description?: string;
}

interface QuickSelectProps<T> {
  options: QuickSelectOption<T>[];
  value: T | T[];
  onChange: (value: T) => void;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pill' | 'card';
  className?: string;
}

export default function QuickSelect<T extends string | number>({
  options,
  value,
  onChange,
  multiple = false,
  size = 'md',
  variant = 'pill',
  className,
}: QuickSelectProps<T>) {
  const isSelected = (optionValue: T) => {
    if (multiple && Array.isArray(value)) {
      return value.includes(optionValue);
    }
    return value === optionValue;
  };

  if (variant === 'card') {
    return (
      <div className={cn('grid grid-cols-2 gap-3', className)}>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = isSelected(option.value);

          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200',
                selected
                  ? 'border-lancaster-gold bg-lancaster-gold/10 text-white'
                  : 'border-tastelanc-surface hover:border-tastelanc-surface-light bg-tastelanc-surface/50 text-gray-300 hover:text-white'
              )}
            >
              {Icon && (
                <Icon
                  className={cn(
                    'w-6 h-6 mb-2',
                    selected ? 'text-lancaster-gold' : 'text-gray-400'
                  )}
                />
              )}
              <span className="font-medium text-sm">{option.label}</span>
              {option.description && (
                <span className="text-xs text-gray-500 mt-1">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const Icon = option.icon;
        const selected = isSelected(option.value);

        return (
          <button
            key={String(option.value)}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full transition-all duration-200 font-medium',
              {
                'px-3 py-1 text-xs': size === 'sm',
                'px-4 py-1.5 text-sm': size === 'md',
                'px-5 py-2 text-base': size === 'lg',
              },
              selected
                ? 'bg-lancaster-gold text-black'
                : 'bg-tastelanc-surface text-gray-400 hover:text-white hover:bg-tastelanc-surface-light'
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
