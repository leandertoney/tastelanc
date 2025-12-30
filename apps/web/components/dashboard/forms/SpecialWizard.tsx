'use client';

import { useState, useCallback } from 'react';
import { Utensils, Drumstick, Fish, Sparkles, Tag } from 'lucide-react';
import { Button } from '@/components/ui';
import StepWizard from './StepWizard';
import WizardStep from './WizardStep';
import TemplateSelector from './TemplateSelector';
import DaySelector from './DaySelector';
import SmartSuggestion from './SmartSuggestion';
import SuccessCelebration from './SuccessCelebration';
import { useSmartDefaults, applySmartDefaults } from './useSmartDefaults';
import { SpecialFormData, Template } from './types';

// Special templates
const SPECIAL_TEMPLATES: Template<Partial<SpecialFormData>>[] = [
  {
    id: 'taco_tuesday',
    name: 'Taco Tuesday',
    description: 'Classic weekly deal',
    icon: Utensils,
    defaults: {
      name: 'Taco Tuesday',
      description: 'Tacos at a special price',
      days_of_week: ['tuesday'],
      is_recurring: true,
    },
  },
  {
    id: 'wing_wednesday',
    name: 'Wing Wednesday',
    description: 'Wings on special',
    icon: Drumstick,
    defaults: {
      name: 'Wing Wednesday',
      description: 'Wings at a discount',
      days_of_week: ['wednesday'],
      is_recurring: true,
    },
  },
  {
    id: 'fish_friday',
    name: 'Fish Friday',
    description: 'Seafood specials',
    icon: Fish,
    defaults: {
      name: 'Fish Friday',
      description: 'Fresh catch specials',
      days_of_week: ['friday'],
      is_recurring: true,
    },
  },
  {
    id: 'daily_special',
    name: 'Daily Special',
    description: 'Everyday deal',
    icon: Tag,
    defaults: {
      name: 'Daily Special',
      days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      is_recurring: true,
    },
  },
];

const INITIAL_FORM_DATA: SpecialFormData = {
  name: '',
  description: '',
  days_of_week: [],
  start_date: '',
  end_date: '',
  start_time: '',
  end_time: '',
  original_price: '',
  special_price: '',
  discount_description: '',
  is_recurring: true,
};

interface SpecialWizardProps {
  onClose: () => void;
  onSubmit: (data: SpecialFormData) => Promise<void>;
}

export default function SpecialWizard({ onClose, onSubmit }: SpecialWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [formData, setFormData] = useState<SpecialFormData>(INITIAL_FORM_DATA);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { suggestion } = useSmartDefaults({ formType: 'special' });

  const totalSteps = 3;

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection('backward');
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleTemplateSelect = (template: Template<Partial<SpecialFormData>>) => {
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
      console.error('Failed to create special:', err);
      setError(err instanceof Error ? err.message : 'Failed to create special. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep1 = formData.name.trim().length > 0 && formData.days_of_week.length > 0;

  // Success state
  if (isSuccess) {
    return (
      <StepWizard
        currentStep={totalSteps - 1}
        totalSteps={totalSteps}
        title="Special Created!"
        onClose={onClose}
      >
        <SuccessCelebration
          title="Special Created!"
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
          ? "What's on special?"
          : step === 1
            ? 'Special Details'
            : 'Review'
      }
      subtitle={step === 0 ? 'Pick a template or create your own' : undefined}
      onClose={onClose}
    >
      {/* Step 0: Template Selection */}
      <WizardStep isActive={step === 0} direction={direction}>
        <TemplateSelector
          templates={SPECIAL_TEMPLATES}
          onSelect={handleTemplateSelect}
          onSkip={handleSkipTemplate}
        />
      </WizardStep>

      {/* Step 1: Details */}
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
              Special Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Taco Tuesday"
              className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., $2 tacos all day"
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

          {/* Price (optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Original Price
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full pl-7 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Special Price
                <span className="text-gray-500 font-normal ml-1">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={formData.special_price}
                  onChange={(e) => setFormData({ ...formData, special_price: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full pl-7 pr-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
                />
              </div>
            </div>
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
          <div className="p-4 bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-lancaster-gold" />
              <h3 className="text-lg font-semibold text-white">{formData.name}</h3>
            </div>
            {formData.description && (
              <p className="text-gray-400 text-sm mb-3">{formData.description}</p>
            )}

            <div className="flex flex-wrap gap-2 text-sm">
              {formData.original_price && formData.special_price && (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded">
                  <span className="line-through text-gray-500 mr-1">
                    ${formData.original_price}
                  </span>
                  ${formData.special_price}
                </span>
              )}
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
              {isSubmitting ? 'Creating...' : 'Create Special'}
            </Button>
          </div>
        </div>
      </WizardStep>
    </StepWizard>
  );
}
