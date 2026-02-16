'use client';

import { createContext, useContext, useMemo } from 'react';
import { BRAND } from '@/config/market';
import {
  Store,
  Clock,
  Image,
  Calendar,
  PartyPopper,
  Sparkles,
} from 'lucide-react';
import { OnboardingStep, OnboardingContextValue } from './types';
import { useOnboardingStorage } from './useOnboarding';

// Define the tour steps
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Dashboard!',
    description:
      `Let's take a quick tour to help you get the most out of ${BRAND.name} for your restaurant.`,
    icon: PartyPopper,
  },
  {
    id: 'profile',
    title: 'Update Your Profile',
    description:
      'This is where customers learn about you. Add your restaurant description, cuisine type, and contact info.',
    icon: Store,
    targetSelector: '[data-onboarding="profile"]',
    position: 'right',
    action: {
      label: 'Go to Profile',
      href: '/dashboard/profile',
    },
  },
  {
    id: 'hours',
    title: 'Set Your Hours',
    description:
      'Let people know when you\'re open. Set your regular hours and any special holiday schedules.',
    icon: Clock,
    targetSelector: '[data-onboarding="hours"]',
    position: 'right',
    action: {
      label: 'Set Hours',
      href: '/dashboard/profile',
    },
  },
  {
    id: 'photos',
    title: 'Add Your Photos',
    description:
      'Photos drive 3x more engagement! Upload your best food shots, ambiance photos, and a hero image.',
    icon: Image,
    targetSelector: '[data-onboarding="photos"]',
    position: 'right',
    action: {
      label: 'Upload Photos',
      href: '/dashboard/profile',
    },
  },
  {
    id: 'events',
    title: 'Create Events & Specials',
    description:
      'Bring in more customers with events, happy hours, and daily specials. Our wizard makes it easy!',
    icon: Calendar,
    targetSelector: '[data-onboarding="events"]',
    position: 'right',
    action: {
      label: 'Add Event',
      href: '/dashboard/events',
    },
  },
  {
    id: 'complete',
    title: "You're All Set!",
    description:
      'You now know the basics. Explore the dashboard to discover more features like analytics and subscription options.',
    icon: Sparkles,
  },
];

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const {
    state,
    isLoaded,
    startTour,
    nextStep: nextStepFn,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
  } = useOnboardingStorage();

  const totalSteps = ONBOARDING_STEPS.length;

  const nextStep = () => {
    if (state.currentStep >= totalSteps - 1) {
      completeTour();
    } else {
      nextStepFn(totalSteps);
    }
  };

  const currentStepData = useMemo(() => {
    if (!state.isActive) return null;
    return ONBOARDING_STEPS[state.currentStep] || null;
  }, [state.isActive, state.currentStep]);

  const contextValue: OnboardingContextValue = {
    state,
    currentStepData,
    totalSteps,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
  };

  // Always provide the context, even before localStorage loads
  // This prevents "useOnboarding must be used within OnboardingProvider" errors
  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}

export { ONBOARDING_STEPS };
