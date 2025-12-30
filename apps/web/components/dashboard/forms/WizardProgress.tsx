'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  className?: string;
}

export default function WizardProgress({
  currentStep,
  totalSteps,
  stepLabels,
  className,
}: WizardProgressProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={index} className="flex items-center">
            {/* Dot */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                {
                  'bg-lancaster-gold text-black': isCompleted,
                  'bg-lancaster-gold/20 ring-2 ring-lancaster-gold text-lancaster-gold': isCurrent,
                  'bg-tastelanc-surface text-gray-500': !isCompleted && !isCurrent,
                }
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>

            {/* Connector line (except for last step) */}
            {index < totalSteps - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 mx-1 transition-all duration-300',
                  isCompleted ? 'bg-lancaster-gold' : 'bg-tastelanc-surface'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
