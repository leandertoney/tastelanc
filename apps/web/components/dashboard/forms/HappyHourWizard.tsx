'use client';

import { useState, useCallback } from 'react';
import { Clock, Sun, Moon, Coffee } from 'lucide-react';
import { Button } from '@/components/ui';
import StepWizard from './StepWizard';
import WizardStep from './WizardStep';
import TemplateSelector from './TemplateSelector';
import DaySelector from './DaySelector';
import TimeRangePicker from './TimeRangePicker';
import SmartSuggestion from './SmartSuggestion';
import SuccessCelebration from './SuccessCelebration';
import HappyHourImageUpload from './HappyHourImageUpload';
import { useSmartDefaults, applySmartDefaults } from './useSmartDefaults';
import { HappyHourFormData, Template, HAPPY_HOUR_DEFAULT } from './types';

// Happy Hour templates
const HAPPY_HOUR_TEMPLATES: Template<Partial<HappyHourFormData>>[] = [
  {
    id: 'classic',
    name: 'Classic Happy Hour',
    description: '4-6pm weekdays',
    icon: Clock,
    defaults: {
      name: 'Happy Hour',
      start_time: '16:00',
      end_time: '18:00',
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  },
  {
    id: 'extended',
    name: 'Extended Happy Hour',
    description: '3-7pm weekdays',
    icon: Sun,
    defaults: {
      name: 'Extended Happy Hour',
      start_time: '15:00',
      end_time: '19:00',
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  },
  {
    id: 'late_night',
    name: 'Late Night Happy Hour',
    description: '9pm-midnight',
    icon: Moon,
    defaults: {
      name: 'Late Night Specials',
      start_time: '21:00',
      end_time: '00:00',
      days_of_week: ['thursday', 'friday', 'saturday'],
    },
  },
  {
    id: 'brunch',
    name: 'Weekend Brunch',
    description: 'Sat-Sun mornings',
    icon: Coffee,
    defaults: {
      name: 'Brunch Specials',
      start_time: '10:00',
      end_time: '14:00',
      days_of_week: ['saturday', 'sunday'],
    },
  },
];

const INITIAL_FORM_DATA: HappyHourFormData = {
  name: '',
  description: '',
  days_of_week: [],
  start_time: '16:00',
  end_time: '18:00',
  image_url: undefined,
};

interface HappyHourWizardProps {
  restaurantId: string;
  onClose: () => void;
  onSubmit: (data: HappyHourFormData) => Promise<void>;
}

export default function HappyHourWizard({ restaurantId, onClose, onSubmit }: HappyHourWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [formData, setFormData] = useState<HappyHourFormData>(INITIAL_FORM_DATA);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { suggestion } = useSmartDefaults({ formType: 'happy_hour' });

  const totalSteps = 3;

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection('backward');
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleTemplateSelect = (template: Template<Partial<HappyHourFormData>>) => {
    setFormData({
      ...INITIAL_FORM_DATA,
      ...template.defaults,
    });
    setShowSuggestion(false);
    goNext();
  };

  const handleSkipTemplate = () => {
    setFormData(INITIAL_FORM_DATA);
    setShowSuggestion(true);
    goNext();
  };

  const handleApplySuggestion = () => {
    if (suggestion) {
      setFormData(applySmartDefaults(formData, suggestion.suggestion));
      setShowSuggestion(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(formData);
      setIsSuccess(true);
    } catch (err) {
      console.error('Failed to create happy hour:', err);
      setError(err instanceof Error ? err.message : 'Failed to create happy hour. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = formData.name.trim().length > 0 &&
                          formData.days_of_week.length > 0 &&
                          formData.start_time &&
                          formData.end_time;

  // Success state
  if (isSuccess) {
    return (
      <StepWizard
        currentStep={totalSteps - 1}
        totalSteps={totalSteps}
        title="Happy Hour Created!"
        onClose={onClose}
      >
        <SuccessCelebration
          title="Happy Hour Created!"
          subtitle={`${formData.name} is now live`}
          onContinue={onClose}
          onAddAnother={() => {
            setFormData(INITIAL_FORM_DATA);
            setStep(0);
            setIsSuccess(false);
          }}
        />
      </StepWizard>
    );
  }

  return (
    <StepWizard
      currentStep={step}
      totalSteps={totalSteps}
      title={
        step === 0
          ? 'Choose a happy hour style'
          : step === 1
            ? 'Set up your happy hour'
            : 'Review'
      }
      subtitle={step === 0 ? 'Pick a template or customize' : undefined}
      onClose={onClose}
    >
      {/* Step 0: Template Selection */}
      <WizardStep isActive={step === 0} direction={direction}>
        <TemplateSelector
          templates={HAPPY_HOUR_TEMPLATES}
          onSelect={handleTemplateSelect}
          onSkip={handleSkipTemplate}
        />
      </WizardStep>

      {/* Step 1: Details & Schedule */}
      <WizardStep isActive={step === 1} direction={direction}>
        <div className="space-y-5">
          {/* Smart Suggestion */}
          {showSuggestion && suggestion && (
            <SmartSuggestion
              message={suggestion.message}
              onApply={handleApplySuggestion}
              onDismiss={() => setShowSuggestion(false)}
            />
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Weekday Happy Hour"
              className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What's on special?
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., $3 drafts, $5 wells, half-price apps"
              rows={2}
              className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold resize-none"
            />
          </div>

          {/* Days */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Which days? *
            </label>
            <DaySelector
              value={formData.days_of_week}
              onChange={(days) => setFormData({ ...formData, days_of_week: days })}
            />
          </div>

          {/* Time Range */}
          <TimeRangePicker
            startTime={formData.start_time}
            endTime={formData.end_time}
            onStartTimeChange={(time) => setFormData({ ...formData, start_time: time })}
            onEndTimeChange={(time) => setFormData({ ...formData, end_time: time })}
          />

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Image
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <HappyHourImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              restaurantId={restaurantId}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button onClick={goNext} disabled={!canProceedStep1} className="flex-1">
              Review
            </Button>
          </div>
        </div>
      </WizardStep>

      {/* Step 2: Review */}
      <WizardStep isActive={step === 2} direction={direction}>
        <div className="space-y-6">
          {/* Preview Card */}
          <div className="bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light overflow-hidden">
            {formData.image_url && (
              <div className="aspect-video">
                <img
                  src={formData.image_url}
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-lancaster-gold" />
                <h3 className="text-lg font-semibold text-white">{formData.name}</h3>
              </div>
              {formData.description && (
                <p className="text-gray-400 text-sm mb-3">{formData.description}</p>
              )}

              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-2 py-1 bg-tastelanc-bg rounded text-gray-300">
                  {formatTime(formData.start_time)} - {formatTime(formData.end_time)}
                </span>
                {formData.days_of_week.map((day) => (
                  <span
                    key={day}
                    className="px-2 py-1 bg-lancaster-gold/20 text-lancaster-gold rounded capitalize"
                  >
                    {day.slice(0, 3)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setError(null);
                goBack();
              }}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Happy Hour'}
            </Button>
          </div>
        </div>
      </WizardStep>
    </StepWizard>
  );
}

function formatTime(time: string): string {
  if (!time) return '';
  if (time === '00:00') return 'Midnight';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${h}:${minutes} ${ampm}`;
}
