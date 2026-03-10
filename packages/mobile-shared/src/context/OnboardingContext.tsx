import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OnboardingData,
  UserType,
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_DATA_KEY,
} from '../types/onboarding';
import { getSupabase } from '../config/theme';

interface OnboardingContextType {
  data: OnboardingData;
  setUserType: (type: UserType) => void;
  setName: (name: string) => void;
  setFrequency: (frequency: string) => void;
  setDiscoverySource: (source: string) => void;
  toggleEventPreference: (event: string) => void;
  toggleBudget: (budget: string) => void;
  toggleEntertainment: (entertainment: string) => void;
  toggleFood: (food: string) => void;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const defaultData: OnboardingData = {
  userType: null,
  name: null,
  frequency: null,
  discoverySource: null,
  eventPreferences: [],
  budgetPreferences: [],
  entertainmentPreferences: [],
  foodPreferences: [],
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaultData);

  const setUserType = (userType: UserType) => {
    setData((prev) => ({ ...prev, userType }));
  };

  const setName = (name: string) => {
    setData((prev) => ({ ...prev, name }));
  };

  const setFrequency = (frequency: string) => {
    setData((prev) => ({ ...prev, frequency }));
  };

  const setDiscoverySource = (source: string) => {
    setData((prev) => ({ ...prev, discoverySource: source }));
  };

  const toggleEventPreference = (event: string) => {
    setData((prev) => ({
      ...prev,
      eventPreferences: prev.eventPreferences.includes(event)
        ? prev.eventPreferences.filter((e) => e !== event)
        : [...prev.eventPreferences, event],
    }));
  };

  const toggleBudget = (budget: string) => {
    setData((prev) => ({
      ...prev,
      budgetPreferences: prev.budgetPreferences.includes(budget)
        ? prev.budgetPreferences.filter((b) => b !== budget)
        : [...prev.budgetPreferences, budget],
    }));
  };

  const toggleEntertainment = (entertainment: string) => {
    setData((prev) => ({
      ...prev,
      entertainmentPreferences: prev.entertainmentPreferences.includes(entertainment)
        ? prev.entertainmentPreferences.filter((e) => e !== entertainment)
        : [...prev.entertainmentPreferences, entertainment],
    }));
  };

  const toggleFood = (food: string) => {
    setData((prev) => ({
      ...prev,
      foodPreferences: prev.foodPreferences.includes(food)
        ? prev.foodPreferences.filter((f) => f !== food)
        : [...prev.foodPreferences, food],
    }));
  };

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(data));

    // Sync display_name to profiles table (fire-and-forget)
    if (data.name) {
      const supabase = getSupabase();
      supabase.auth.getUser().then(({ data: authData }) => {
        if (authData?.user?.id) {
          supabase
            .from('profiles')
            .update({ display_name: data.name })
            .eq('id', authData.user.id)
            .then(
              () => {},
              (e: any) => console.warn('[Onboarding] Failed to sync display_name:', e),
            );
        }
      });
    }
  }, [data]);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
    await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
    setData(defaultData);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        data,
        setUserType,
        setName,
        setFrequency,
        setDiscoverySource,
        toggleEventPreference,
        toggleBudget,
        toggleEntertainment,
        toggleFood,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
