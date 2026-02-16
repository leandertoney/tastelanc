'use client';

import { useMemo } from 'react';
import { BRAND } from '@/config/market';
import {
  EventType,
  DayOfWeek,
  SmartDefault,
  SmartSuggestionData,
  SMART_DEFAULTS,
  HAPPY_HOUR_DEFAULT,
  calculateEndTime,
} from './types';

interface UseSmartDefaultsConfig {
  formType: 'event' | 'happy_hour' | 'special';
  eventType?: EventType;
}

interface UseSmartDefaultsReturn {
  suggestion: SmartSuggestionData | null;
  getDefaults: () => SmartDefault;
  getMessage: () => string;
}

const SMART_MESSAGES: Record<EventType, string> = {
  trivia: `Trivia nights are most popular on Wednesdays at 7pm. It's a ${BRAND.countyShort} tradition!`,
  live_music: `Friday and Saturday nights at 8pm are prime time for live music in ${BRAND.countyShort}.`,
  karaoke: "Thursday and Friday at 9pm brings out the best karaoke crowds!",
  dj: "DJ nights peak on weekends starting at 10pm. Get ready to party!",
  comedy: "Comedy shows do best on Friday and Saturday at 8pm. Laughter guaranteed!",
  sports: "Sunday at noon is perfect for sports watch parties. Go Eagles!",
  bingo: "Bingo nights are a hit on Wednesday and Thursday at 7pm. Get your daubers ready!",
  other: "Evening events on Fridays tend to draw the biggest crowds.",
};

const HAPPY_HOUR_MESSAGE = "Classic happy hour runs 4-6pm on weekdays. Perfect for the after-work crowd!";

const SPECIAL_MESSAGES: Record<string, string> = {
  default: "Mid-week specials (Tuesday-Wednesday) help drive traffic on slower days.",
  monday: "Monday specials help beat the start-of-week blues!",
  tuesday: `Taco Tuesday is a ${BRAND.countyShort} favorite!`,
  wednesday: "Wing Wednesday brings in the crowds.",
  thursday: "Thursday specials set up a great weekend vibe.",
  friday: "Friday specials kick off the weekend right!",
};

export function useSmartDefaults({
  formType,
  eventType,
}: UseSmartDefaultsConfig): UseSmartDefaultsReturn {
  const getDefaults = useMemo(() => {
    return (): SmartDefault => {
      switch (formType) {
        case 'event':
          return eventType ? SMART_DEFAULTS[eventType] : SMART_DEFAULTS.other;
        case 'happy_hour':
          return HAPPY_HOUR_DEFAULT;
        case 'special':
          return {
            time: '11:00',
            days: ['tuesday', 'wednesday'],
          };
        default:
          return SMART_DEFAULTS.other;
      }
    };
  }, [formType, eventType]);

  const getMessage = useMemo(() => {
    return (): string => {
      switch (formType) {
        case 'event':
          return eventType ? SMART_MESSAGES[eventType] : SMART_MESSAGES.other;
        case 'happy_hour':
          return HAPPY_HOUR_MESSAGE;
        case 'special':
          return SPECIAL_MESSAGES.default;
        default:
          return '';
      }
    };
  }, [formType, eventType]);

  const suggestion = useMemo((): SmartSuggestionData | null => {
    const defaults = getDefaults();
    const message = getMessage();

    if (!message) return null;

    return {
      suggestion: defaults,
      message,
    };
  }, [getDefaults, getMessage]);

  return {
    suggestion,
    getDefaults,
    getMessage,
  };
}

// Helper to apply smart defaults to form data
export function applySmartDefaults<T>(
  formData: T,
  defaults: SmartDefault
): T {
  const updates: Partial<{
    start_time: string;
    end_time: string;
    days_of_week: DayOfWeek[];
  }> = {};

  if (defaults.time) {
    updates.start_time = defaults.time;
  }

  if (defaults.endTime) {
    updates.end_time = defaults.endTime;
  } else if (defaults.time && defaults.duration) {
    updates.end_time = calculateEndTime(defaults.time, defaults.duration);
  }

  if (defaults.days) {
    updates.days_of_week = defaults.days;
  }

  return { ...formData, ...updates } as T;
}
