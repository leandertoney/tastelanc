'use client';

import { useState, useEffect, useCallback } from 'react';
import { OnboardingState, STORAGE_KEY, DEFAULT_STATE } from './types';

interface StoredOnboarding {
  completed: boolean;
  skippedAt?: string;
  completedAt?: string;
}

export function useOnboardingStorage() {
  const [state, setState] = useState<OnboardingState>(DEFAULT_STATE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredOnboarding = JSON.parse(stored);
        setState({
          ...DEFAULT_STATE,
          completed: parsed.completed,
          skippedAt: parsed.skippedAt,
          completedAt: parsed.completedAt,
          // Don't auto-start if already completed or skipped
          isActive: false,
        });
      } else {
        // First time user - auto-start the tour
        setState({
          ...DEFAULT_STATE,
          isActive: true,
        });
      }
    } catch {
      // If localStorage fails, default to showing tour
      setState({
        ...DEFAULT_STATE,
        isActive: true,
      });
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when state changes
  const saveState = useCallback((newState: Partial<StoredOnboarding>) => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const current: StoredOnboarding = stored
        ? JSON.parse(stored)
        : { completed: false };

      const updated = { ...current, ...newState };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }, []);

  const startTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
      currentStep: 0,
    }));
  }, []);

  const nextStep = useCallback((totalSteps: number) => {
    setState((prev) => {
      if (prev.currentStep >= totalSteps - 1) {
        return prev; // Don't go past last step
      }
      return {
        ...prev,
        currentStep: prev.currentStep + 1,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
    }));
  }, []);

  const skipTour = useCallback(() => {
    const skippedAt = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      isActive: false,
      skippedAt,
    }));
    saveState({ skippedAt });
  }, [saveState]);

  const completeTour = useCallback(() => {
    const completedAt = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      isActive: false,
      completed: true,
      completedAt,
    }));
    saveState({ completed: true, completedAt });
  }, [saveState]);

  const restartTour = useCallback(() => {
    setState({
      ...DEFAULT_STATE,
      isActive: true,
      currentStep: 0,
    });
  }, []);

  return {
    state,
    isLoaded,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    restartTour,
  };
}
