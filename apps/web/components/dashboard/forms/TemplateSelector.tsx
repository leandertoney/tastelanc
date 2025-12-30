'use client';

import { cn } from '@/lib/utils';
import { Template } from './types';
import { ArrowRight, Plus } from 'lucide-react';

interface TemplateSelectorProps<T> {
  templates: Template<T>[];
  onSelect: (template: Template<T>) => void;
  onSkip: () => void;
  title?: string;
  skipLabel?: string;
  className?: string;
}

export default function TemplateSelector<T>({
  templates,
  onSelect,
  onSkip,
  title = 'Choose a template',
  skipLabel = 'Start from scratch',
  className,
}: TemplateSelectorProps<T>) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Template Grid */}
      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => {
          const Icon = template.icon;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              className={cn(
                'group relative flex flex-col items-center p-4 rounded-xl',
                'bg-tastelanc-surface/50 border border-tastelanc-surface-light',
                'hover:border-lancaster-gold/50 hover:bg-tastelanc-surface',
                'transition-all duration-200',
                'text-left'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center mb-3',
                  'bg-tastelanc-surface group-hover:bg-lancaster-gold/20',
                  'transition-colors'
                )}
              >
                <Icon className="w-6 h-6 text-lancaster-gold" />
              </div>

              {/* Text */}
              <h3 className="text-sm font-medium text-white text-center mb-1">
                {template.name}
              </h3>
              <p className="text-xs text-gray-500 text-center line-clamp-2">
                {template.description}
              </p>

              {/* Hover arrow */}
              <div
                className={cn(
                  'absolute top-2 right-2 p-1 rounded-full',
                  'bg-lancaster-gold text-black',
                  'opacity-0 group-hover:opacity-100',
                  'transform translate-x-1 group-hover:translate-x-0',
                  'transition-all duration-200'
                )}
              >
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-tastelanc-surface-light" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-tastelanc-bg text-gray-500">or</span>
        </div>
      </div>

      {/* Skip / Start from scratch */}
      <button
        type="button"
        onClick={onSkip}
        className={cn(
          'w-full flex items-center justify-center gap-2 p-4 rounded-xl',
          'border border-dashed border-tastelanc-surface-light',
          'text-gray-400 hover:text-white hover:border-gray-500',
          'transition-colors'
        )}
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-medium">{skipLabel}</span>
      </button>
    </div>
  );
}
