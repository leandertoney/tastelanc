'use client';

import { cn } from '@/lib/utils';
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import WizardProgress from './WizardProgress';

interface StepWizardProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
  className?: string;
}

export default function StepWizard({
  children,
  currentStep,
  totalSteps,
  title,
  subtitle,
  onClose,
  className,
}: StepWizardProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll when wizard is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Wizard Container */}
      <div
        className={cn(
          'relative w-full max-w-lg mx-4 bg-tastelanc-bg border border-tastelanc-surface-light rounded-2xl shadow-2xl animate-scale-in overflow-hidden',
          'max-h-[90vh] flex flex-col',
          className
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-tastelanc-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress */}
          <WizardProgress
            currentStep={currentStep}
            totalSteps={totalSteps}
            className="mb-4"
          />

          {/* Title */}
          <h2 className="text-xl font-bold text-white text-center">{title}</h2>
          {subtitle && (
            <p className="text-gray-400 text-center mt-1 text-sm">{subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {children}
        </div>
      </div>
    </div>
  );
}
