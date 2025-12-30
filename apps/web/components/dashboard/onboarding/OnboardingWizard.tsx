'use client';

import { useEffect } from 'react';
import { useOnboarding } from './OnboardingProvider';
import OnboardingSpotlight from './OnboardingSpotlight';
import OnboardingStepCard from './OnboardingStep';

export default function OnboardingWizard() {
  const {
    state,
    currentStepData,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
  } = useOnboarding();

  // Prevent body scroll when onboarding is active
  useEffect(() => {
    if (state.isActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [state.isActive]);

  // Handle escape key to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && state.isActive) {
        skipTour();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, skipTour]);

  if (!state.isActive || !currentStepData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Spotlight overlay */}
      <OnboardingSpotlight
        targetSelector={currentStepData.targetSelector}
        isActive={state.isActive}
      />

      {/* Backdrop for non-targeted steps */}
      {!currentStepData.targetSelector && (
        <div className="fixed inset-0 bg-black/75 z-[65]" />
      )}

      {/* Step card */}
      <OnboardingStepCard
        step={currentStepData}
        currentIndex={state.currentStep}
        totalSteps={totalSteps}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </div>
  );
}
