'use client';

import { useState, useCallback } from 'react';
import { Music, HelpCircle, Mic2, Calendar, PartyPopper, Tv, Laugh } from 'lucide-react';
import { Button } from '@/components/ui';
import StepWizard from './StepWizard';
import WizardStep from './WizardStep';
import TemplateSelector from './TemplateSelector';
import DaySelector from './DaySelector';
import TimePicker from './TimePicker';
import SmartSuggestion from './SmartSuggestion';
import SuccessCelebration from './SuccessCelebration';
import { useSmartDefaults, applySmartDefaults } from './useSmartDefaults';
import {
  EventFormData,
  EventType,
  DayOfWeek,
  Template,
  SMART_DEFAULTS,
  calculateEndTime,
} from './types';
import EventImageUpload from './EventImageUpload';

// Event templates
const EVENT_TEMPLATES: Template<Partial<EventFormData>>[] = [
  {
    id: 'trivia',
    name: 'Trivia Night',
    description: 'Classic pub trivia',
    icon: HelpCircle,
    defaults: {
      event_type: 'trivia',
      name: 'Trivia Night',
      start_time: '19:00',
      days_of_week: ['wednesday'],
      is_recurring: true,
    },
  },
  {
    id: 'live_music',
    name: 'Live Music',
    description: 'Local bands & artists',
    icon: Music,
    defaults: {
      event_type: 'live_music',
      name: 'Live Music',
      start_time: '20:00',
      days_of_week: ['friday', 'saturday'],
      is_recurring: true,
    },
  },
  {
    id: 'karaoke',
    name: 'Karaoke',
    description: 'Sing your heart out',
    icon: Mic2,
    defaults: {
      event_type: 'karaoke',
      name: 'Karaoke Night',
      start_time: '21:00',
      days_of_week: ['thursday'],
      is_recurring: true,
    },
  },
  {
    id: 'dj',
    name: 'DJ Night',
    description: 'Dance the night away',
    icon: Music,
    defaults: {
      event_type: 'dj',
      name: 'DJ Night',
      start_time: '22:00',
      days_of_week: ['friday', 'saturday'],
      is_recurring: true,
    },
  },
  {
    id: 'comedy',
    name: 'Comedy Night',
    description: 'Stand-up & laughs',
    icon: Laugh,
    defaults: {
      event_type: 'comedy',
      name: 'Comedy Night',
      start_time: '20:00',
      days_of_week: ['friday'],
      is_recurring: true,
    },
  },
  {
    id: 'sports',
    name: 'Sports Watch',
    description: 'Big game viewing',
    icon: Tv,
    defaults: {
      event_type: 'sports',
      name: 'Game Day',
      start_time: '12:00',
      days_of_week: ['sunday'],
      is_recurring: true,
    },
  },
];

const INITIAL_FORM_DATA: EventFormData = {
  name: '',
  event_type: 'other',
  description: '',
  performer_name: '',
  start_time: '19:00',
  end_time: '',
  is_recurring: true,
  days_of_week: [],
  event_date: '',
};

interface EventWizardProps {
  onClose: () => void;
  onSubmit: (data: EventFormData) => Promise<void>;
  restaurantId: string;
}

export default function EventWizard({ onClose, onSubmit, restaurantId }: EventWizardProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM_DATA);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { suggestion } = useSmartDefaults({
    formType: 'event',
    eventType: formData.event_type,
  });

  const totalSteps = 4;

  const goNext = useCallback(() => {
    setDirection('forward');
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection('backward');
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleTemplateSelect = (template: Template<Partial<EventFormData>>) => {
    const smartDefault = SMART_DEFAULTS[template.defaults.event_type || 'other'];
    const endTime = smartDefault.duration
      ? calculateEndTime(template.defaults.start_time || '19:00', smartDefault.duration)
      : '';

    setFormData({
      ...INITIAL_FORM_DATA,
      ...template.defaults,
      end_time: endTime,
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
      onClose(); // Close modal after successful creation
    } catch (err) {
      console.error('Failed to create event:', err);
      setError(err instanceof Error ? err.message : 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedStep2 = formData.name.trim().length > 0;
  const canProceedStep3 = formData.is_recurring
    ? formData.days_of_week.length > 0 && formData.start_time
    : formData.event_date && formData.start_time;

  // Success state
  if (isSuccess) {
    return (
      <StepWizard
        currentStep={totalSteps - 1}
        totalSteps={totalSteps}
        title="Event Created!"
        onClose={onClose}
      >
        <SuccessCelebration
          title="Event Created!"
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
          ? 'What kind of event?'
          : step === 1
            ? 'Event Details'
            : step === 2
              ? 'When does it happen?'
              : 'Review Your Event'
      }
      subtitle={
        step === 0 ? 'Choose a template or start fresh' : undefined
      }
      onClose={onClose}
    >
      {/* Step 0: Template Selection */}
      <WizardStep isActive={step === 0} direction={direction}>
        <TemplateSelector
          templates={EVENT_TEMPLATES}
          onSelect={handleTemplateSelect}
          onSkip={handleSkipTemplate}
        />
      </WizardStep>

      {/* Step 1: Event Details */}
      <WizardStep isActive={step === 1} direction={direction}>
        <div className="space-y-4">
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
              Event Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Trivia Night"
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
              placeholder="Tell people what to expect..."
              rows={2}
              className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold resize-none"
            />
          </div>

          {/* Performer */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Performer / Host
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              type="text"
              value={formData.performer_name}
              onChange={(e) => setFormData({ ...formData, performer_name: e.target.value })}
              placeholder="e.g., The Jazz Quartet"
              className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
            />
          </div>

          {/* Custom Artwork */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Artwork
              <span className="text-gray-500 font-normal ml-1">(optional)</span>
            </label>
            <EventImageUpload
              value={formData.image_url}
              onChange={(url) => setFormData({ ...formData, image_url: url })}
              restaurantId={restaurantId}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button onClick={goNext} disabled={!canProceedStep2} className="flex-1">
              Continue
            </Button>
          </div>
        </div>
      </WizardStep>

      {/* Step 2: Schedule */}
      <WizardStep isActive={step === 2} direction={direction}>
        <div className="space-y-6">
          {/* Recurring Toggle */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_recurring: true })}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                formData.is_recurring
                  ? 'bg-lancaster-gold text-black'
                  : 'bg-tastelanc-surface text-gray-400'
              }`}
            >
              Recurring (weekly)
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_recurring: false })}
              className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                !formData.is_recurring
                  ? 'bg-lancaster-gold text-black'
                  : 'bg-tastelanc-surface text-gray-400'
              }`}
            >
              One-time event
            </button>
          </div>

          {/* Days or Date */}
          {formData.is_recurring ? (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Which days? *
              </label>
              <DaySelector
                value={formData.days_of_week}
                onChange={(days) => setFormData({ ...formData, days_of_week: days })}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Date *
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-4 py-3 bg-tastelanc-surface border border-tastelanc-surface-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lancaster-gold"
              />
            </div>
          )}

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <TimePicker
              value={formData.start_time}
              onChange={(time) => setFormData({ ...formData, start_time: time })}
              label="Start Time *"
            />
            <TimePicker
              value={formData.end_time}
              onChange={(time) => setFormData({ ...formData, end_time: time })}
              label="End Time"
              minTime={formData.start_time}
              showPresets={false}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={goBack} className="flex-1">
              Back
            </Button>
            <Button onClick={goNext} disabled={!canProceedStep3} className="flex-1">
              Review
            </Button>
          </div>
        </div>
      </WizardStep>

      {/* Step 3: Review */}
      <WizardStep isActive={step === 3} direction={direction}>
        <div className="space-y-6">
          {/* Preview Card */}
          <div className="p-4 bg-tastelanc-surface rounded-xl border border-tastelanc-surface-light">
            <h3 className="text-lg font-semibold text-white mb-1">{formData.name}</h3>
            {formData.performer_name && (
              <p className="text-lancaster-gold text-sm mb-2">{formData.performer_name}</p>
            )}
            {formData.description && (
              <p className="text-gray-400 text-sm mb-3">{formData.description}</p>
            )}

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-2 py-1 bg-tastelanc-bg rounded text-gray-300">
                {formatTime(formData.start_time)}
                {formData.end_time && ` - ${formatTime(formData.end_time)}`}
              </span>
              {formData.is_recurring ? (
                formData.days_of_week.map((day) => (
                  <span
                    key={day}
                    className="px-2 py-1 bg-lancaster-gold/20 text-lancaster-gold rounded capitalize"
                  >
                    {day.slice(0, 3)}
                  </span>
                ))
              ) : (
                <span className="px-2 py-1 bg-lancaster-gold/20 text-lancaster-gold rounded">
                  {formData.event_date}
                </span>
              )}
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
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </div>
      </WizardStep>
    </StepWizard>
  );
}

function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours) % 12 || 12;
  const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM';
  return `${h}:${minutes} ${ampm}`;
}
