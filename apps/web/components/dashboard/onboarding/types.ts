import { LucideIcon } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  targetSelector?: string; // CSS selector for element to highlight
  position?: 'left' | 'right' | 'top' | 'bottom';
  action?: {
    label: string;
    href?: string;
  };
}

export interface OnboardingState {
  isActive: boolean;
  currentStep: number;
  completed: boolean;
  skippedAt?: string;
  completedAt?: string;
}

export interface OnboardingContextValue {
  state: OnboardingState;
  currentStepData: OnboardingStep | null;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  restartTour: () => void;
}

export const STORAGE_KEY = 'tastelanc_onboarding';

export const DEFAULT_STATE: OnboardingState = {
  isActive: false,
  currentStep: 0,
  completed: false,
};
