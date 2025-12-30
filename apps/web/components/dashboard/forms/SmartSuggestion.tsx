'use client';

import { cn } from '@/lib/utils';
import { Sparkles, X, Check } from 'lucide-react';

interface SmartSuggestionProps {
  message: string;
  onApply: () => void;
  onDismiss: () => void;
  className?: string;
}

export default function SmartSuggestion({
  message,
  onApply,
  onDismiss,
  className,
}: SmartSuggestionProps) {
  return (
    <div
      className={cn(
        'relative p-4 rounded-xl bg-gradient-to-r from-lancaster-gold/10 to-lancaster-gold/5',
        'border border-lancaster-gold/20',
        'animate-scale-in',
        className
      )}
    >
      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 p-2 bg-lancaster-gold/20 rounded-lg">
          <Sparkles className="w-5 h-5 text-lancaster-gold" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <p className="text-sm font-medium text-lancaster-gold mb-1">
            Smart Suggestion
          </p>
          <p className="text-sm text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={onApply}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-lancaster-gold text-black hover:bg-lancaster-gold/90',
            'transition-colors'
          )}
        >
          <Check className="w-4 h-4" />
          Apply Suggestion
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white transition-colors"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
