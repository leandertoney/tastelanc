'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { OnboardingStep as StepType } from './types';
import { Button } from '@/components/ui';

interface OnboardingStepProps {
  step: StepType;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

interface Position {
  top: number;
  left: number;
}

export default function OnboardingStepCard({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: OnboardingStepProps) {
  const router = useRouter();
  const [position, setPosition] = useState<Position | null>(null);
  const Icon = step.icon;

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;
  const hasTarget = !!step.targetSelector;

  useEffect(() => {
    if (!step.targetSelector) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const element = document.querySelector(step.targetSelector!);
      if (element) {
        const rect = element.getBoundingClientRect();
        const cardWidth = 320;
        const cardHeight = 200;
        const padding = 16;

        let top = rect.top;
        let left = rect.right + padding;

        // Check if card would go off-screen to the right
        if (left + cardWidth > window.innerWidth) {
          left = rect.left - cardWidth - padding;
        }

        // Check if card would go off-screen at bottom
        if (top + cardHeight > window.innerHeight) {
          top = window.innerHeight - cardHeight - padding;
        }

        // Ensure card doesn't go above viewport
        if (top < padding) {
          top = padding;
        }

        setPosition({ top, left });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [step.targetSelector]);

  const handleAction = () => {
    if (step.action?.href) {
      router.push(step.action.href);
    }
    onNext();
  };

  // Center modal for welcome/complete steps
  const cardStyle = hasTarget && position
    ? {
        position: 'fixed' as const,
        top: position.top,
        left: position.left,
        width: '320px',
      }
    : {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        maxWidth: '90vw',
      };

  return (
    <div
      className="bg-tastelanc-surface border border-tastelanc-surface-light rounded-xl shadow-2xl z-[70] animate-scale-in"
      style={cardStyle}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-tastelanc-surface-light">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-lancaster-gold/20 rounded-lg">
            <Icon className="w-5 h-5 text-lancaster-gold" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{step.title}</h3>
            <p className="text-xs text-gray-500">
              Step {currentIndex + 1} of {totalSteps}
            </p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-gray-300 text-sm leading-relaxed">{step.description}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t border-tastelanc-surface-light">
        {/* Progress dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex
                  ? 'bg-lancaster-gold'
                  : i < currentIndex
                    ? 'bg-lancaster-gold/50'
                    : 'bg-tastelanc-surface-light'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              onClick={onPrev}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Previous step"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {isLastStep ? (
            <Button onClick={onNext} size="sm">
              Get Started
            </Button>
          ) : step.action ? (
            <Button onClick={handleAction} size="sm">
              {step.action.label}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={onNext} size="sm">
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
